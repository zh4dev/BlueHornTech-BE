import { z } from "zod";
import { idSchema, idValidatorSchema } from "./global-schema";
import ErrorMessageConstant from "../constants/message/error-message-constant";

export const taskFields = {
  title: z.string().min(3),
  description: z.string().min(3),
};

export const taskUpdateFields = {
  id: idValidatorSchema,
  ...taskFields,
};

export const updateTaskStatusSchema = z.object({
  params: idSchema,
  body: z
    .object({
      completed: z.boolean(),
      reason: z.string().optional(),
    })
    .refine(
      (val) => val.completed || (val.reason && val.reason.trim() !== ""),
      {
        message: ErrorMessageConstant.reasonRequired,
        path: ["reason"],
      }
    ),
});

export const createTaskSchema = z.object({
  scheduleId: idValidatorSchema,
  ...taskFields,
});
