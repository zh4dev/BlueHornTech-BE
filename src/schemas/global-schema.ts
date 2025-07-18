import { z } from "zod";
import ErrorMessageConstant from "../constants/message/error-message-constant";

export const idValidatorSchema = z
  .union([z.string(), z.number()])
  .refine((val) => !isNaN(Number(val)), {
    message: ErrorMessageConstant.idMustBeNumeric,
  })
  .transform((val) => Number(val));

export const idSchema = z.object({
  id: idValidatorSchema,
});

export const getAllSchema = z.object({
  pageSize: z.coerce.number().int().min(1),
  pageNumber: z.coerce.number().int().min(1),
});
