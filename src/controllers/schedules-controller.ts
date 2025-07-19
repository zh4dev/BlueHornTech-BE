import { Request, Response } from "express";
import prisma from "../services/prisma-client-service";
import { DateHelper } from "../helpers/date-helper";
import { SuccessMessageConstant } from "../constants/message/success-message-constant";
import ErrorMessageConstant from "../constants/message/error-message-constant";
import { ServerCode } from "../constants/enum-constant";
import {
  createScheduleSchema,
  geolocationSchema,
  getAllScheduleSchema,
  startedScheduleSchema,
  updateScheduleSchema,
} from "../schemas/schedules-schema";
import ScheduleHelper from "../helpers/schedules-helper";
import PrismaHelper from "../helpers/prisma-helper";
import {
  Prisma,
  Schedule,
  ServiceName,
  Task,
  User,
  UserRole,
} from "@prisma/client";
import { CrudControllerHelper } from "../helpers/crud-controller-helper";
import GlobalConstant from "../constants/global-constant";
import { idSchema } from "../schemas/global-schema";
import GeocodeHelper from "../helpers/geocode-helper";

class SchedulesController extends CrudControllerHelper {
  constructor() {
    super("schedule");
  }

  public async resetAndGenerateData(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { lat, lng } = geolocationSchema.parse(req.body);

      await prisma.visitLog.deleteMany();
      await prisma.task.deleteMany();
      await prisma.schedule.deleteMany();
      await prisma.user.deleteMany();

      const caregiver = await prisma.user.create({
        data: {
          name: "Caregiver",
          email: "caregiver1@example.com",
          address: "123 Main St, Springfield, IL 62704",
          phone: "081234567890",
          role: UserRole.CAREGIVER,
          picture: "https://randomuser.me/api/portraits/women/40.jpg",
        },
      });

      const client = await prisma.user.create({
        data: {
          name: "Client",
          email: "client1@example.com",
          address: "789 Oak Avenue, San Francisco, CA 94102",
          phone: "089876543210",
          role: UserRole.CLIENT,
          picture: "https://randomuser.me/api/portraits/women/25.jpg",
        },
      });

      const numberOfSchedules = 5;
      const serviceNames = Object.values(ServiceName);
      const initialStartTime = DateHelper.getDateNow();

      for (let i = 0; i < numberOfSchedules; i++) {
        const startTime = DateHelper.convertToDate(
          initialStartTime.getTime() + i * 60 * 60 * 1000
        );
        const endTime = DateHelper.convertToDate(
          startTime.getTime() + 60 * 60 * 1000
        );

        const selectedServiceName = serviceNames[i % serviceNames.length];

        const schedule = await prisma.schedule.create({
          data: {
            date: initialStartTime,
            startTime,
            endTime,
            lat,
            lng,
            serviceName: selectedServiceName as ServiceName,
            caregiverId: caregiver.id,
            clientId: client.id,
            serviceNotes: `Dummy schedule ${i + 1}`,
          },
        });

        await prisma.task.createMany({
          data: [
            {
              title: `Task ${i + 1}A`,
              description: "Do something important",
              scheduleId: schedule.id,
            },
            {
              title: `Task ${i + 1}B`,
              description: "Another task description",
              scheduleId: schedule.id,
            },
          ],
        });
      }

      await this.serverHelper.sendResponse({
        res,
        req,
        success: true,
        message: SuccessMessageConstant.successResetGenerateData,
        serverCode: ServerCode.success,
      });
    } catch (e) {
      await this.serverHelper.onCatchError(e, res, req);
    }
  }

  public async delete(req: Request, res: Response): Promise<void> {
    return await super.delete(req, res, {
      onCustomDeleteLogic: async (data: Schedule) => {
        await prisma.$transaction([
          prisma.visitLog.deleteMany({ where: { scheduleId: data.id } }),
          prisma.task.deleteMany({ where: { scheduleId: data.id } }),
        ]);
      },
    });
  }

  public async edit(req: Request, res: Response): Promise<void> {
    try {
      const data = updateScheduleSchema.parse({
        params: req.params,
        body: req.body,
      });
      const { id } = data.params;
      const body = data.body;

      const existingSchedule = await PrismaHelper.dataExistValue<Schedule>({
        model: "schedule",
        id,
      });
      if (!existingSchedule) {
        await this.serverHelper.sendResponse({
          res,
          req,
          success: false,
          message: ErrorMessageConstant.dataNotFound(GlobalConstant.schedule),
          serverCode: ServerCode.notFound,
        });
        return;
      }

      const caregiverId = body.caregiverId ?? existingSchedule.caregiverId;
      const clientId = body.clientId ?? existingSchedule.clientId;

      if (
        !(await ScheduleHelper.validateDifferentUsersOrRespond(
          caregiverId,
          clientId,
          req,
          res
        ))
      )
        return;

      if (body.caregiverId) {
        const caregiver = await ScheduleHelper.validateUserRoleOrRespond(
          body.caregiverId,
          UserRole.CAREGIVER,
          GlobalConstant.caregiver,
          req,
          res
        );
        if (!caregiver) return;
      }

      if (body.clientId) {
        const client = await ScheduleHelper.validateUserRoleOrRespond(
          body.clientId,
          UserRole.CLIENT,
          GlobalConstant.client,
          req,
          res
        );
        if (!client) return;
      }

      const date = DateHelper.convertToDate(body.date ?? existingSchedule.date);
      const startTime = DateHelper.combineDateAndTime(
        date,
        body.startTime ?? existingSchedule.startTime
      );
      const endTime = DateHelper.combineDateAndTime(
        date,
        body.endTime ?? existingSchedule.endTime
      );
      const serviceName = body.serviceName ?? existingSchedule.serviceName;

      if (
        !(await ScheduleHelper.isCaregiverAvailable({
          id: existingSchedule.id,
          caregiverId,
          date,
          startTime,
          endTime,
          req,
          res,
        }))
      )
        return;

      if (body.date || body.startTime || body.endTime) {
        const isValid = await ScheduleHelper.validateStartEndTimeOrRespond(
          startTime,
          endTime,
          req,
          res
        );
        if (!isValid) return;
      }

      const updatedSchedule = await prisma.$transaction(async (tx) => {
        if (body.tasks?.length) {
          await ScheduleHelper.handleTaskUpdate(tx, id, body.tasks);
        }

        return tx.schedule.update({
          where: { id },
          data: {
            date,
            startTime,
            endTime,
            serviceName: serviceName.toUpperCase() as ServiceName,
            caregiverId: body.caregiverId,
            clientId: body.clientId,
            serviceNotes: body.serviceNotes,
            lat: body.lat,
            lng: body.lng,
          },
          include: { tasks: true },
        });
      });

      await this.serverHelper.sendResponse({
        res,
        req,
        success: true,
        message: SuccessMessageConstant.success,
        serverCode: ServerCode.success,
        data: updatedSchedule,
      });
    } catch (e) {
      await this.serverHelper.onCatchError(e, res, req);
    }
  }

  public async create(req: Request, res: Response): Promise<void> {
    try {
      const data = createScheduleSchema.parse(req.body);
      const date = DateHelper.convertToDate(data.date);
      const startTime = DateHelper.combineDateAndTime(date, data.startTime);
      const endTime = DateHelper.combineDateAndTime(date, data.endTime);

      if (
        !(await ScheduleHelper.validateDifferentUsersOrRespond(
          data.caregiverId,
          data.clientId,
          req,
          res
        ))
      )
        return;

      const caregiver = await ScheduleHelper.validateUserRoleOrRespond(
        data.caregiverId,
        UserRole.CAREGIVER,
        GlobalConstant.caregiver,
        req,
        res
      );
      if (!caregiver) return;

      const client = await ScheduleHelper.validateUserRoleOrRespond(
        data.clientId,
        UserRole.CLIENT,
        GlobalConstant.client,
        req,
        res
      );
      if (!client) return;

      if (
        !(await ScheduleHelper.isCaregiverAvailable({
          caregiverId: data.caregiverId,
          date,
          startTime,
          endTime,
          req,
          res,
        }))
      )
        return;

      if (
        !(await ScheduleHelper.validateStartEndTimeOrRespond(
          startTime,
          endTime,
          req,
          res
        ))
      )
        return;

      const newSchedule = await prisma.schedule.create({
        data: {
          date,
          startTime,
          endTime,
          serviceName: data.serviceName.toUpperCase() as ServiceName,
          caregiverId: data.caregiverId,
          clientId: data.clientId,
          serviceNotes: data.serviceNotes,
          lat: data.lat,
          lng: data.lng,
          tasks: data.tasks?.length
            ? {
                create: data.tasks.map((task) => ({
                  title: task.title,
                  description: task.description,
                })),
              }
            : undefined,
        },
        include: { tasks: true },
      });

      await this.serverHelper.sendResponse({
        res,
        req,
        success: true,
        message: SuccessMessageConstant.success,
        serverCode: ServerCode.created,
        data: newSchedule,
      });
    } catch (e) {
      await this.serverHelper.onCatchError(e, res, req);
    }
  }

  private updatedObject = async (s: any): Promise<Record<string, any>> => {
    const location = await GeocodeHelper.getAddressFromCoordinates(
      s.lat,
      s.lng
    );
    return {
      id: s.id,
      clientName: s.client.name,
      clientPicture: s.client.picture,
      shiftTime: { start: s.startTime, end: s.endTime },
      visitTime: s.visitLog && {
        start: s.visitLog.startTime,
        end: s.visitLog.endTime,
      },
      location: location,
      status: ScheduleHelper.getScheduleStatus(s),
      serviceName: s.serviceName,
      caregiver: {
        id: s.caregiver.id,
        name: s.caregiver.name,
      },
      date: s.date,
    };
  };

  private updatedList = async (
    list: Record<string, any>[]
  ): Promise<Record<string, any>> => {
    return await Promise.all(
      list.map(async (s: any) => await this.updatedObject(s))
    );
  };

  public getStartedSchedule = async (req: Request, res: Response) => {
    try {
      const data = startedScheduleSchema.parse(req.body);
      const now = DateHelper.getDateNow();
      const { start, end } = DateHelper.getTodayRange();

      const value = await prisma.schedule.findFirst({
        where: {
          caregiverId: data.caregiverId,
          date: {
            gte: start,
            lte: end,
          },
          startTime: {
            lte: now,
          },
          endTime: {
            gte: now,
          },
          visitLog: {
            is: {
              startLat: {
                not: null,
              },
              startLng: {
                not: null,
              },
              startTime: {
                not: null,
              },
              endTime: null,
            },
          },
        },
        orderBy: {
          startTime: "asc",
        },
        include: {
          client: true,
          caregiver: true,
          visitLog: true,
          tasks: true,
        },
      });

      await this.serverHelper.sendResponse({
        res,
        req,
        success: true,
        message: SuccessMessageConstant.success,
        serverCode: ServerCode.success,
        data: value ? this.updatedObject(value) : null,
      });
    } catch (e) {
      await this.serverHelper.onCatchError(e, res, req);
    }
  };

  private validateUser = async (
    req: Request,
    res: Response,
    id: number | undefined,
    expectedRole: UserRole
  ): Promise<boolean> => {
    if (!id) return true;

    const userValue = await PrismaHelper.dataExistValue<User>({
      model: "user",
      id,
    });

    if (!userValue) {
      await this.serverHelper.sendResponse({
        res,
        req,
        success: false,
        message: ErrorMessageConstant.dataNotFound(GlobalConstant.user),
        serverCode: ServerCode.badRequest,
      });
      return false;
    }

    if (userValue.role !== expectedRole) {
      await this.serverHelper.sendResponse({
        res,
        req,
        success: false,
        message: ErrorMessageConstant.invalidUser(expectedRole),
        serverCode: ServerCode.badRequest,
      });
      return false;
    }

    return true;
  };

  public getAll = async (req: Request, res: Response) => {
    try {
      const { showToday, caregiverId, clientId } = getAllScheduleSchema.parse(
        req.query
      );

      if (
        !(await this.validateUser(req, res, caregiverId, UserRole.CAREGIVER)) ||
        !(await this.validateUser(req, res, clientId, UserRole.CLIENT))
      )
        return;

      const baseWhere = { caregiverId, clientId };
      let filter: Record<string, any> = { ...baseWhere };
      let stats: Record<string, number> | undefined = undefined;

      if (showToday) {
        const { start, end } = DateHelper.getTodayRange();
        filter.date = { gte: start, lte: end };

        const totalCount = await prisma.schedule.count({ where: baseWhere });

        const [completedCount, missedCount] = await Promise.all([
          prisma.schedule.count({
            where: {
              ...baseWhere,
              date: { gte: start, lte: end },
              visitLog: { endTime: { not: null } },
            },
          }),
          prisma.schedule.count({
            where: {
              ...baseWhere,
              endTime: { lt: DateHelper.getDateNow() },
              OR: [
                { visitLog: null },
                {
                  visitLog: {
                    startTime: { not: null },
                    endTime: null,
                  },
                },
              ],
            },
          }),
        ]);

        stats = {
          total: totalCount,
          completed: completedCount,
          missed: missedCount,
          upcoming: totalCount - completedCount - missedCount,
        };
      }

      const include = {
        client: true,
        caregiver: true,
        visitLog: true,
        tasks: true,
      };

      const orderBy = { startTime: "asc" as const };

      let result = await PrismaHelper.getAll<Schedule>({
        req,
        model: "schedule",
        filter,
        include,
        orderBy,
      });

      if (showToday && result.list.length === 0) {
        const fallbackFilter = { ...filter };
        delete fallbackFilter.date;

        result = await PrismaHelper.getAll<Schedule>({
          req,
          model: "schedule",
          filter: fallbackFilter,
          include,
          orderBy,
        });
      }

      const totalSchedules = await prisma.schedule.count({ where: baseWhere });

      await this.serverHelper.sendResponse({
        res,
        req,
        success: true,
        message: SuccessMessageConstant.success,
        serverCode: ServerCode.success,
        data: {
          ...result,
          list: await this.updatedList(result.list),
          stats,
          totalSchedules,
        },
      });
    } catch (e) {
      await this.serverHelper.onCatchError(e, res, req);
    }
  };

  public getDetail = async (req: Request, res: Response) => {
    try {
      const data = idSchema.parse(req.params);
      const schedule = await prisma.schedule.findUnique({
        where: { id: data.id },
        include: { client: true, visitLog: true, tasks: true, caregiver: true },
      });

      if (!schedule) {
        await this.serverHelper.sendResponse({
          res,
          req,
          success: false,
          message: ErrorMessageConstant.dataNotFound(GlobalConstant.schedule),
          serverCode: ServerCode.notFound,
        });
        return;
      }

      const visitLat = schedule.visitLog?.startLat;
      const visitLng = schedule.visitLog?.startLng;
      let visitAddress: string | null = null;

      if (visitLat && visitLng) {
        visitAddress = await GeocodeHelper.getAddressFromCoordinates(
          visitLat,
          visitLng
        );
      }

      await this.serverHelper.sendResponse({
        res,
        req,
        success: true,
        message: SuccessMessageConstant.success,
        serverCode: ServerCode.success,
        data: {
          ...schedule,
          visitLog: {
            ...schedule.visitLog,
            address: visitAddress,
          },
          status: ScheduleHelper.getScheduleStatus(schedule),
        },
      });
    } catch (e) {
      await this.serverHelper.onCatchError(e, res, req);
    }
  };

  public startVisit = async (req: Request, res: Response) => {
    try {
      const { id } = idSchema.parse(req.params);
      const { lat, lng } = geolocationSchema.parse(req.body);

      const schedule = await prisma.schedule.findUnique({
        where: { id },
        include: { visitLog: true },
      });

      if (!schedule) {
        await this.serverHelper.sendResponse({
          res,
          req,
          success: false,
          message: ErrorMessageConstant.dataNotFound(GlobalConstant.schedule),
          serverCode: ServerCode.notFound,
        });
        return;
      }

      const isLocationNear = await ScheduleHelper.isLocationNear({
        schedule,
        userLat: lat,
        userLng: lng,
        req,
        res,
      });
      if (!isLocationNear) {
        return;
      }

      const validation = await ScheduleHelper.validateVisitStart({
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        visitLog: schedule.visitLog,
        req,
        res,
      });

      if (!validation) {
        return;
      }

      const visit = await prisma.visitLog.upsert({
        where: { scheduleId: schedule.id },
        update: {
          startTime: DateHelper.getDateNow(),
          startLat: lat,
          startLng: lng,
        },
        create: {
          startTime: DateHelper.getDateNow(),
          startLat: lat,
          startLng: lng,
          scheduleId: schedule.id,
        },
      });

      await this.serverHelper.sendResponse({
        res,
        req,
        success: true,
        message: SuccessMessageConstant.visitStarted,
        serverCode: ServerCode.success,
        data: visit,
      });
    } catch (e) {
      await this.serverHelper.onCatchError(e, res, req);
    }
  };

  public endVisit = async (req: Request, res: Response) => {
    try {
      const { id } = idSchema.parse(req.params);
      const { lat, lng } = geolocationSchema.parse(req.body);

      const schedule = await prisma.schedule.findUnique({
        where: { id },
        include: { visitLog: true },
      });

      if (!schedule) {
        await this.serverHelper.sendResponse({
          res,
          req,
          success: false,
          message: ErrorMessageConstant.dataNotFound(GlobalConstant.schedule),
          serverCode: ServerCode.notFound,
        });
        return;
      }

      const isLocationNear = await ScheduleHelper.isLocationNear({
        schedule,
        userLat: lat,
        userLng: lng,
        req,
        res,
      });
      if (!isLocationNear) {
        return;
      }

      const validation = await ScheduleHelper.validateVisitEnd({
        visitLog: schedule.visitLog,
        req,
        res,
      });

      if (!validation) {
        return;
      }

      const taskNotCompleted = await prisma.task.count({
        where: {
          scheduleId: schedule.id,
          reason: null,
          OR: [{ completed: false }, { completed: null }],
        },
      });

      if (taskNotCompleted > 0) {
        await this.serverHelper.sendResponse({
          res,
          req,
          success: false,
          message: ErrorMessageConstant.completeTaskFirst,
          serverCode: ServerCode.forbidden,
        });
        return;
      }

      const updatedLog = await prisma.visitLog.update({
        where: { scheduleId: schedule.id },
        data: {
          endTime: DateHelper.getDateNow(),
          endLat: lat,
          endLng: lng,
        },
      });

      await this.serverHelper.sendResponse({
        res,
        req,
        success: true,
        message: SuccessMessageConstant.visitEnded,
        serverCode: ServerCode.success,
        data: updatedLog,
      });
    } catch (e) {
      await this.serverHelper.onCatchError(e, res, req);
    }
  };

  public cancelVisit = async (req: Request, res: Response) => {
    try {
      const { id } = idSchema.parse(req.params);

      const schedule = await prisma.schedule.findUnique({
        where: { id },
        include: { visitLog: true },
      });

      if (!schedule) {
        await this.serverHelper.sendResponse({
          res,
          req,
          success: false,
          message: ErrorMessageConstant.dataNotFound(GlobalConstant.schedule),
          serverCode: ServerCode.notFound,
        });
        return;
      }

      const visitLog = schedule.visitLog;

      if (!visitLog || !visitLog.startTime) {
        await this.serverHelper.sendResponse({
          res,
          req,
          success: false,
          message: ErrorMessageConstant.visitNotStarted,
          serverCode: ServerCode.badRequest,
        });
        return;
      }

      if (visitLog.endTime) {
        await this.serverHelper.sendResponse({
          res,
          req,
          success: false,
          message: ErrorMessageConstant.cannotCancelCompletedVisit,
          serverCode: ServerCode.badRequest,
        });
        return;
      }

      await prisma.visitLog.delete({
        where: { scheduleId: schedule.id },
      });

      await this.serverHelper.sendResponse({
        res,
        req,
        success: true,
        message: SuccessMessageConstant.visitCancelled,
        serverCode: ServerCode.success,
      });
    } catch (e) {
      await this.serverHelper.onCatchError(e, res, req);
    }
  };
}

export default SchedulesController;
