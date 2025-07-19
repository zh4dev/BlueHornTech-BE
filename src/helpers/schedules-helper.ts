import { Schedule, Task, User, UserRole, VisitLog } from "@prisma/client";
import { DateHelper } from "./date-helper";
import ErrorMessageConstant from "../constants/message/error-message-constant";
import PrismaHelper from "./prisma-helper";
import ServerHelper from "./server-helper";
import { Request, Response } from "express";
import { ScheduleStatusType, ServerCode } from "../constants/enum-constant";
import prisma from "../services/prisma-client-service";
import { ServerErrorInterface } from "../interfaces/server/server-error-interface";
import GlobalConstant from "../constants/global-constant";
import { getDistance } from "geolib";

class ScheduleHelper {
  private static serverHelper = new ServerHelper();

  private static statusPriority: Record<ScheduleStatusType, number> = {
    started: 1,
    upcoming: 2,
    missed: 3,
    "in-progress": 4,
    completed: 5,
  };

  static shortListData(list: Schedule[]): Schedule[] {
    return list.sort((a, b) => {
      const aStatus = this.getScheduleStatus({
        startTime: a.startTime,
        endTime: a.endTime,
        visitLog: (a as any).visitLog,
      });
      const bStatus = ScheduleHelper.getScheduleStatus({
        startTime: b.startTime,
        endTime: b.endTime,
        visitLog: (b as any).visitLog,
      });
      return this.statusPriority[aStatus] - this.statusPriority[bStatus];
    });
  }

  static getScheduleStatus(schedule: {
    startTime: Date;
    endTime: Date;
    visitLog?: VisitLog | null;
  }): ScheduleStatusType {
    if (schedule.visitLog?.endTime) {
      return "completed";
    }

    if (DateHelper.getDateNow() > schedule.endTime) {
      return "missed";
    }

    if (schedule.visitLog?.startTime) {
      return "in-progress";
    }

    if (DateHelper.getDateNow() > schedule.startTime) {
      return "started";
    }

    return "upcoming";
  }

  static async validateVisitStart({
    startTime,
    endTime,
    visitLog,
    req,
    res,
  }: {
    startTime: Date;
    endTime: Date;
    visitLog?: VisitLog | null;
    req: Request;
    res: Response;
  }): Promise<boolean> {
    const now = DateHelper.getDateNow();
    const scheduleStart = DateHelper.convertToDate(startTime);
    const scheduleEnd = DateHelper.convertToDate(endTime);
    const bufferMinutes = 15;

    if (visitLog?.startTime) {
      await this.serverHelper.sendResponse({
        res,
        req,
        success: false,
        message: ErrorMessageConstant.visitAlreadyStarted,
        serverCode: ServerCode.badRequest,
      });
      return false;
    }

    const startWithBuffer = DateHelper.convertToDate(scheduleStart.getTime());
    startWithBuffer.setMinutes(startWithBuffer.getMinutes() - bufferMinutes);

    if (now < startWithBuffer) {
      await this.serverHelper.sendResponse({
        res,
        req,
        success: false,
        message: ErrorMessageConstant.cannotStartVisitBefore(bufferMinutes),
        serverCode: ServerCode.badRequest,
      });
      return false;
    }

    if (now > scheduleEnd) {
      await this.serverHelper.sendResponse({
        res,
        req,
        success: false,
        message: ErrorMessageConstant.cannotStartVisitAfter,
        serverCode: ServerCode.badRequest,
      });
      return false;
    }

    return true;
  }

  static async validateVisitEnd({
    visitLog,
    req,
    res,
  }: {
    visitLog?: VisitLog | null;
    req: Request;
    res: Response;
  }): Promise<boolean> {
    const now = DateHelper.getDateNow();
    const minVisitDuration = 5;

    if (!visitLog?.startTime) {
      await this.serverHelper.sendResponse({
        res,
        req,
        success: false,
        message: ErrorMessageConstant.visitNotStarted,
        serverCode: ServerCode.badRequest,
      });
      return false;
    }

    if (visitLog.endTime) {
      await this.serverHelper.sendResponse({
        res,
        req,
        success: false,
        message: ErrorMessageConstant.visitAlreadyEnded,
        serverCode: ServerCode.badRequest,
      });
      return false;
    }

    const minEndTime = DateHelper.convertToDate(visitLog.startTime);
    minEndTime.setMinutes(minEndTime.getMinutes() + minVisitDuration);

    if (now < minEndTime) {
      await this.serverHelper.sendResponse({
        res,
        req,
        success: false,
        message: ErrorMessageConstant.visitMustAtLeast(minVisitDuration),
        serverCode: ServerCode.badRequest,
      });
      return false;
    }

    return true;
  }

  static async isLocationNear({
    schedule,
    userLat,
    userLng,
    req,
    res,
  }: {
    schedule: Schedule;
    userLat: number;
    userLng: number;
    req: Request;
    res: Response;
  }): Promise<boolean> {
    if (!schedule.lat || !schedule.lng) return false;

    const coord1 = { latitude: schedule.lat, longitude: schedule.lng };
    const coord2 = { latitude: userLat, longitude: userLng };

    const distanceInMeters = getDistance(coord1, coord2);

    if (distanceInMeters > 100) {
      await this.serverHelper.sendResponse({
        res,
        req,
        success: false,
        message: ErrorMessageConstant.farFromLocation(distanceInMeters),
        serverCode: ServerCode.badRequest,
      });
      return false;
    }

    return true;
  }

  static async handleTaskUpdate(
    tx: any,
    scheduleId: number,
    tasks: { id: number; description: string }[]
  ): Promise<void> {
    await Promise.all(
      tasks.map(async (task) => {
        const exists = await PrismaHelper.dataExistValue<Task>({
          model: "task",
          id: task.id,
        });
        if (!exists) {
          throw new ServerErrorInterface(
            ErrorMessageConstant.dataNotFound(
              `${GlobalConstant.task} with the id ${task.id}`
            ),
            ServerCode.notFound
          );
        }
      })
    );

    await tx.task.deleteMany({ where: { scheduleId } });
    await tx.task.createMany({
      data: tasks.map((task) => ({
        description: task.description,
        scheduleId,
      })),
    });
  }

  static async validateUserRoleOrRespond(
    userId: number,
    expectedRole: UserRole,
    roleLabel: string,
    req: Request,
    res: Response
  ): Promise<User | null> {
    const user = await PrismaHelper.dataExistValue<User>({
      model: "user",
      id: userId,
    });

    if (!user) {
      this.serverHelper.sendResponse({
        res,
        req,
        success: false,
        message: ErrorMessageConstant.dataNotFound(roleLabel),
        serverCode: ServerCode.notFound,
      });
      return null;
    }

    if (user.role !== expectedRole) {
      await this.serverHelper.sendResponse({
        res,
        req,
        success: false,
        message: ErrorMessageConstant.invalidUser(expectedRole),
        serverCode: ServerCode.badRequest,
      });
      return null;
    }

    return user;
  }

  static async validateStartEndTimeOrRespond(
    startTime: Date,
    endTime: Date,
    req: Request,
    res: Response
  ): Promise<boolean> {
    if (startTime >= endTime) {
      await this.serverHelper.sendResponse({
        res,
        req,
        success: false,
        message: ErrorMessageConstant.endStarTimeError,
        serverCode: ServerCode.badRequest,
      });
      return false;
    }

    return true;
  }

  static async validateDifferentUsersOrRespond(
    caregiverId: number,
    clientId: number,
    req: Request,
    res: Response
  ): Promise<boolean> {
    if (caregiverId === clientId) {
      await this.serverHelper.sendResponse({
        res,
        req,
        success: false,
        message: ErrorMessageConstant.invalidRequest,
        serverCode: ServerCode.badRequest,
      });
      return false;
    }

    return true;
  }

  static async isCaregiverAvailable({
    id,
    caregiverId,
    date,
    startTime,
    endTime,
    req,
    res,
  }: {
    id?: number;
    caregiverId: number;
    date: Date;
    startTime: Date;
    endTime: Date;
    req: Request;
    res: Response;
  }): Promise<boolean> {
    const schedules = await prisma.schedule.findMany({
      where: {
        caregiverId,
        id: id && {
          not: id,
        },
      },
    });

    const isClashing = schedules.some((s) => {
      const sDate = DateHelper.convertToDate(s.date).toDateString();
      const tDate = date.toDateString();

      if (sDate !== tDate) return false;

      const sStart = DateHelper.convertToDate(s.startTime);
      const sEnd = DateHelper.convertToDate(s.endTime);

      return sStart < endTime && startTime < sEnd;
    });

    if (isClashing) {
      await this.serverHelper.sendResponse({
        res,
        req,
        success: false,
        message: ErrorMessageConstant.caregiverIsNotAvailable,
        serverCode: ServerCode.conflict,
      });
      return false;
    }

    return true;
  }
}

export default ScheduleHelper;
