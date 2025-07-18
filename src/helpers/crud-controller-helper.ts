import { Request, Response } from "express";
import ControllerHelper from "./controller-helper";
import { AllowedModels, ServerCode } from "../constants/enum-constant";
import PrismaHelper from "./prisma-helper";
import { SuccessMessageConstant } from "../constants/message/success-message-constant";
import prisma from "../services/prisma-client-service";
import ErrorMessageConstant from "../constants/message/error-message-constant";
import { idSchema } from "../schemas/global-schema";

export abstract class CrudControllerHelper extends ControllerHelper {
  private modelName: AllowedModels;

  constructor(modelName: AllowedModels) {
    super();
    this.modelName = modelName;
  }

  private async isDataFound(
    id: number,
    res: Response,
    req: Request
  ): Promise<any | null> {
    const value = await PrismaHelper.dataExistValue<any>({
      model: this.modelName,
      id: id,
    });
    if (!value) {
      await this.serverHelper.sendResponse({
        res,
        req,
        success: false,
        message: ErrorMessageConstant.dataNotFound(),
        serverCode: ServerCode.notFound,
      });
      return null;
    }
    return value;
  }

  public async edit(req: Request, res: Response): Promise<void> {
    try {
      const request = req.body;
      const data = idSchema.parse(request);

      if (!data.id) {
        await this.serverHelper.sendResponse({
          res,
          req,
          success: false,
          message: ErrorMessageConstant.someRequestAreEmpty,
          serverCode: ServerCode.badRequest,
        });
        return;
      }

      const dataExists = await this.isDataFound(data.id, res, req);
      if (!dataExists) {
        return;
      }

      delete request.id;
      const updatedData = await (prisma[this.modelName] as any).update({
        where: { id: data.id },
        data: request,
      });

      await this.serverHelper.sendResponse({
        res,
        req,
        success: true,
        message: SuccessMessageConstant.success,
        serverCode: ServerCode.success,
        data: updatedData,
      });
    } catch (e) {
      await this.serverHelper.onCatchError(e, res, req);
    }
  }

  public async create(req: Request, res: Response): Promise<void> {
    try {
      const request: any = req.body;

      const value = await (prisma[this.modelName] as any).create({
        data: request,
      });

      const isCreated = value !== null;

      await this.serverHelper.sendResponse({
        res,
        req,
        success: isCreated,
        message: isCreated
          ? SuccessMessageConstant.success
          : ErrorMessageConstant.errorDefault,
        serverCode: isCreated ? ServerCode.created : ServerCode.serverError,
        data: value,
      });
    } catch (e) {
      await this.serverHelper.onCatchError(e, res, req);
    }
  }

  public async delete(
    req: Request,
    res: Response,
    {
      onCustomDeleteLogic,
    }: {
      onCustomDeleteLogic?: (data: any) => Promise<void>;
    } = {}
  ): Promise<void> {
    const { id } = req.query;

    if (!id || isNaN(Number(id))) {
      await this.serverHelper.sendResponse({
        res,
        req,
        success: false,
        message: ErrorMessageConstant.invalidRequest,
        serverCode: ServerCode.badRequest,
      });
      return;
    }

    try {
      const parsedId = Number(id);
      const dataExists = await this.isDataFound(parsedId, res, req);
      if (!dataExists) {
        return;
      }

      if (onCustomDeleteLogic) {
        await onCustomDeleteLogic(dataExists);
      }

      await (prisma[this.modelName] as any).delete({
        where: { id: Number(id) },
      });

      await this.serverHelper.sendResponse({
        res,
        req,
        success: true,
        message: SuccessMessageConstant.success,
        serverCode: ServerCode.success,
      });
    } catch (e) {
      await this.serverHelper.onCatchError(e, res, req);
    }
  }

  public getAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await PrismaHelper.getAll<any>({
        req,
        model: this.modelName,
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
}
