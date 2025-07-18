import { ServerCode } from "../constants/enum-constant";
import ErrorMessageConstant from "../constants/message/error-message-constant";
import { ServerErrorInterface } from "../interfaces/server/server-error-interface";

export class DateHelper {
  static getDateNow(): Date {
    return new Date();
  }

  static getDateNowString(): string {
    return this.getDateNow().toString();
  }

  static combineDateAndTime(date: Date, time: string | Date): Date {
    if (time instanceof Date) {
      return time;
    }
    const [hours, minutes, seconds] = time.split(":").map(Number);
    const fullDateTime = new Date(date);
    fullDateTime.setHours(hours, minutes, seconds, 0);
    return fullDateTime;
  }

  static convertToDate(value: string | Date | number): Date {
    if (typeof value === "string") {
      const normalized = value.includes("T") ? value : `${value}T00:00:00`;
      const date = new Date(normalized);
      if (isNaN(date.getTime())) {
        throw new ServerErrorInterface(
          ErrorMessageConstant.dateError,
          ServerCode.badRequest
        );
      }
      return date;
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new ServerErrorInterface(
        ErrorMessageConstant.dateError,
        ServerCode.badRequest
      );
    }
    return date;
  }

  static getTodayRange = () => {
    const start = this.getDateNow();
    start.setHours(0, 0, 0, 0);

    const end = this.getDateNow();
    end.setHours(23, 59, 59, 999);

    return { start, end };
  };

  static isSameDate = (d1: Date, d2: Date): boolean =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}
