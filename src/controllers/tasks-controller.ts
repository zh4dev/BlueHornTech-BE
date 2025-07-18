import { Request, Response } from "express";
import prisma from "../services/prisma-client-service";
import ErrorMessageConstant from "../constants/message/error-message-constant";
import { SuccessMessageConstant } from "../constants/message/success-message-constant";
import { ServerCode } from "../constants/enum-constant";
import {
  createTaskSchema,
  updateTaskStatusSchema,
} from "../schemas/tasks-schema";
import GlobalConstant from "../constants/global-constant";
import { CrudControllerHelper } from "../helpers/crud-controller-helper";

class TasksController extends CrudControllerHelper {
  constructor() {
    super("task");
  }

  public async create(req: Request, res: Response): Promise<void> {
    try {
      const data = createTaskSchema.parse(req.body);
      const createdTask = await prisma.task.create({
        data: {
          title: data.title,
          description: data.description,
          scheduleId: data.scheduleId,
        },
      });

      await this.serverHelper.sendResponse({
        res,
        req,
        success: true,
        message: SuccessMessageConstant.taskUpdated,
        serverCode: ServerCode.success,
        data: createdTask,
      });
    } catch (e) {
      await this.serverHelper.onCatchError(e, res, req);
    }
  }

  public updateTaskStatus = async (req: Request, res: Response) => {
    try {
      const data = updateTaskStatusSchema.parse({
        params: req.params,
        body: req.body,
      });

      const { id } = data.params;
      const { completed, reason } = data.body;

      const existingTask = await prisma.task.findUnique({
        where: { id },
      });

      if (!existingTask) {
        await this.serverHelper.sendResponse({
          res,
          req,
          success: false,
          message: ErrorMessageConstant.dataNotFound(GlobalConstant.task),
          serverCode: ServerCode.notFound,
        });
        return;
      }

      const updatedTask = await prisma.task.update({
        where: { id },
        data: {
          completed,
          reason: completed ? null : reason,
        },
      });

      await this.serverHelper.sendResponse({
        res,
        req,
        success: true,
        message: SuccessMessageConstant.taskUpdated,
        serverCode: ServerCode.success,
        data: updatedTask,
      });
    } catch (e) {
      await this.serverHelper.onCatchError(e, res, req);
    }
  };
}

export default TasksController;
