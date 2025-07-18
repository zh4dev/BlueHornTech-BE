import { Request } from "express";
import ErrorMessageConstant from "../constants/message/error-message-constant";
import DiscordWebHookService from "../services/discord-web-hook-service";
import { ServerCode } from "../constants/enum-constant";

export class ErrorHelper {
  public static async getMessage(
    error: any | null,
    req?: Request
  ): Promise<string> {
    let errorMessage: string = ErrorMessageConstant.errorDefault;
    let apiPath = req?.url || "Unknown Path";
    let method = req?.method || "Unknown Method";

    if (error && typeof error === "object") {
      if ("message" in error && typeof error.message === "string") {
        errorMessage = error.message;
      }
    }

    const stack = new Error().stack;
    let functionName = "Unknown Function";

    if (stack) {
      const stackLines = stack.split("\n");
      if (stackLines.length > 2) {
        functionName = stackLines[2].trim();
      }
    }

    if (error?.serverCode == ServerCode.serverError) {
      console.error(
        `API: [${method}] ${apiPath} | Function: ${functionName} | Message: ${errorMessage} | Code: ${
          error?.code ?? "No Code"
        }`
      );

      await DiscordWebHookService.sendErrorToDiscord({
        functionName: functionName,
        error: errorMessage,
      });
    } else {
      console.error("Error occurred:", error);
    }

    return errorMessage;
  }
}
