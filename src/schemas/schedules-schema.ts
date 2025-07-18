import { z } from "zod";
import { taskFields, taskUpdateFields } from "./tasks-schema";
import { getAllSchema, idSchema, idValidatorSchema } from "./global-schema";
import RegexHelper from "../helpers/regex-helper";
import ErrorMessageConstant from "../constants/message/error-message-constant";
import { ServiceName } from "@prisma/client";

const geoLocationFields = {
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
};

export const geolocationSchema = z.object({
  ...geoLocationFields,
});

const scheduleFields = {
  date: z.string().regex(RegexHelper.dateFormatRegex, {
    message: ErrorMessageConstant.dateFormatError,
  }),
  startTime: z.string().regex(RegexHelper.timeFormatRegex, {
    message: `Start time ${ErrorMessageConstant.timeFormatError}`,
  }),
  endTime: z.string().regex(RegexHelper.timeFormatRegex, {
    message: `End time ${ErrorMessageConstant.timeFormatError}`,
  }),
  serviceNotes: z.string().min(15),
  caregiverId: z.number().int().positive(),
  clientId: z.number().int().positive(),
  serviceName: z.string().refine(
    (val) => {
      if (val === undefined) return true;
      return Object.values(ServiceName).includes(
        val.toUpperCase() as ServiceName
      );
    },
    {
      message: ErrorMessageConstant.invalidRequest,
      path: ["serviceName"],
    }
  ),
  ...geoLocationFields,
};

export const getAllScheduleSchema = getAllSchema.extend({
  showToday: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((val) => {
      if (typeof val === "string") return val === "true";
      return val ?? false;
    }),
  caregiverId: idValidatorSchema.optional(),
  clientId: idValidatorSchema.optional(),
});

export const createScheduleSchema = z.object({
  ...scheduleFields,
  tasks: z.array(z.object(taskFields)).optional(),
});

export const startedScheduleSchema = z.object({
  caregiverId: idValidatorSchema,
});

export const updateScheduleSchema = z.object({
  params: idSchema,
  body: z
    .object({
      ...scheduleFields,
      tasks: z.array(z.object(taskUpdateFields)).optional(),
    })
    .partial(),
});
