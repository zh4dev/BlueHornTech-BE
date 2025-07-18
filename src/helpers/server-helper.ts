import { Response, Request } from "express";
import { ResponseInterface } from "../interfaces/server/response-interface";
import { ErrorHelper } from "./error-helper";
import ErrorMessageConstant from "../constants/message/error-message-constant";
import { ServerErrorInterface } from "../interfaces/server/server-error-interface";
import { PrismaError, ServerCode } from "../constants/enum-constant";
import { z } from "zod";

class ServerHelper {
  public async sendResponse({
    res,
    req,
    success,
    message,
    data = null,
    serverCode,
  }: {
    res: Response;
    req?: Request;
    success: boolean;
    message: any;
    data?: any;
    serverCode: ServerCode;
  }): Promise<void> {
    try {
      res.status(serverCode).json({
        success,
        statusCode: serverCode,
        message,
        data,
      } as ResponseInterface);
    } catch (e) {
      await ErrorHelper.getMessage(e, req);
    }
  }

  public async onCatchError(
    e: unknown,
    res: Response,
    req: Request
  ): Promise<void> {
    let valueMessage = ErrorMessageConstant.internalServerError;
    let valueServerCode = ServerCode.serverError;

    if (e instanceof z.ZodError) {
      valueMessage = z.prettifyError(e).replace("✖ ", "");
      valueServerCode = ServerCode.badRequest;
    } else if (e instanceof ServerErrorInterface) {
      valueMessage = e.message;
      valueServerCode = e.serverCode;
    } else if (e instanceof Error) {
      if (
        e.message.includes(PrismaError.invalid) &&
        e.message.includes(PrismaError.findFirst)
      ) {
        valueMessage = ErrorMessageConstant.errorFind;
      } else if (
        e.message.includes(PrismaError.invalid) &&
        e.message.includes(PrismaError.update)
      ) {
        valueMessage = ErrorMessageConstant.errorUpdate;
      } else {
        valueMessage = ErrorMessageConstant.errorDefault;
      }
    }

    await ErrorHelper.getMessage(e);

    await this.sendResponse({
      res,
      req,
      success: false,
      message: valueMessage,
      serverCode: valueServerCode,
    });
  }
}

export default ServerHelper;
