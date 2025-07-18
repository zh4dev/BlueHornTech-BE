import { ServerCode } from "../constants/enum-constant";
import ErrorMessageConstant from "../constants/message/error-message-constant";
import { DateHelper } from "../helpers/date-helper";
import { ServerErrorInterface } from "../interfaces/server/server-error-interface";

class DiscordWebHookService {
  public static async sendErrorToDiscord({
    functionName,
    error,
  }: {
    functionName: string;
    error: string;
  }): Promise<void> {
    const webHookDiscord = process.env.WEB_HOOK_DISCORD;
    if (!webHookDiscord) {
      throw new ServerErrorInterface(
        ErrorMessageConstant.errorDefault,
        ServerCode.serverError
      );
    }
    const payload = {
      content: `[${DateHelper.getDateNowString()}] | ${functionName}\n\n${error}`,
    };
    await fetch(process.env.WEB_HOOK_DISCORD!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }
}

export default DiscordWebHookService;
