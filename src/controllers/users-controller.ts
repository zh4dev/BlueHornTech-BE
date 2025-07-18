import { Schedule, User } from "@prisma/client";
import { CrudControllerHelper } from "../helpers/crud-controller-helper";
import { Request, Response } from "express";
import ErrorMessageConstant from "../constants/message/error-message-constant";
import { ServerCode } from "../constants/enum-constant";
import PrismaHelper from "../helpers/prisma-helper";
import { ServerErrorInterface } from "../interfaces/server/server-error-interface";
import {
  createUserSchema,
  getAllUserSchema,
  updateUserSchema,
} from "../schemas/users-schema";
import { SuccessMessageConstant } from "../constants/message/success-message-constant";
import GlobalConstant from "../constants/global-constant";

class UsersController extends CrudControllerHelper {
  constructor() {
    super("user");
  }

  private async isAllPassed(
    req: Request,
    res: Response,
    isEdit: boolean
  ): Promise<boolean> {
    try {
      const data = isEdit
        ? updateUserSchema.parse(req.body)
        : createUserSchema.parse(req.body);

      const id = req.body.id; // usually only present during edit

      if (data.email) {
        const existingUser = await PrismaHelper.dataExistValue<User>({
          model: "user",
          customValue: {
            email: data.email,
          },
        });

        if (
          existingUser &&
          (!isEdit || existingUser.id !== id) // allow same user in edit
        ) {
          await this.serverHelper.sendResponse({
            res,
            req,
            success: false,
            message: ErrorMessageConstant.dataAlreadyExists(
              GlobalConstant.email
            ),
            serverCode: ServerCode.forbidden,
          });
          return false;
        }
      }

      if (data.phone) {
        const existingUser = await PrismaHelper.dataExistValue<User>({
          model: "user",
          customValue: {
            phone: data.phone,
          },
        });

        if (existingUser && (!isEdit || existingUser.id !== id)) {
          await this.serverHelper.sendResponse({
            res,
            req,
            success: false,
            message: ErrorMessageConstant.dataAlreadyExists(
              GlobalConstant.phoneNumber
            ),
            serverCode: ServerCode.forbidden,
          });
          return false;
        }
      }

      req.body = data;
      return true;
    } catch (e) {
      await this.serverHelper.onCatchError(e, res, req);
      return false;
    }
  }

  public getAll = async (req: Request, res: Response) => {
    try {
      const { pageSize, pageNumber, role } = getAllUserSchema.parse(req.query);
      const result = await PrismaHelper.getAll<User>({
        req,
        model: "user",
        pageSize,
        pageNumber,
        filter: role
          ? {
              role: role.toUpperCase(),
            }
          : undefined,
      });

      await this.serverHelper.sendResponse({
        res,
        req,
        success: true,
        message: SuccessMessageConstant.success,
        serverCode: ServerCode.success,
        data: result,
      });
    } catch (e) {
      await this.serverHelper.onCatchError(e, res, req);
    }
  };

  public async create(req: Request, res: Response): Promise<void> {
    const isAllPassed = await this.isAllPassed(req, res, false);
    if (!isAllPassed) {
      return;
    }

    return await super.create(req, res);
  }

  public async edit(req: Request, res: Response): Promise<void> {
    const isAllPassed = await this.isAllPassed(req, res, true);
    if (!isAllPassed) {
      return;
    }

    return await super.edit(req, res);
  }

  public async delete(req: Request, res: Response): Promise<void> {
    return await super.delete(req, res, {
      onCustomDeleteLogic: async (data: User) => {
        const value = await PrismaHelper.dataExistValue<Schedule>({
          model: "schedule",
          customValue: {
            caregiverId: data.id,
            clientId: data.id,
          },
        });
        if (value) {
          throw new ServerErrorInterface(
            ErrorMessageConstant.dataIsBeingUsed,
            ServerCode.forbidden
          );
        }
      },
    });
  }
}

export default UsersController;
