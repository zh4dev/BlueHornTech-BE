import { UserRole } from "@prisma/client";
import { z } from "zod";
import ErrorMessageConstant from "../constants/message/error-message-constant";
import { getAllSchema, idSchema, idValidatorSchema } from "./global-schema";
import RegexHelper from "../helpers/regex-helper";

const userFields = {
  name: z.string().min(3),
  address: z.string().min(3),
  email: z.email(),
  role: z.enum(Object.values(UserRole) as [string, ...string[]]),
  serviceName: z.string().optional(),
  picture: z.string().optional(),
  phone: z.string().regex(RegexHelper.phoneFormatRegex, {
    message: ErrorMessageConstant.phoneNumberNotValid,
  }),
};

export const getAllUserSchema = getAllSchema.extend({
  role: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (val === undefined) return true;
        return Object.values(UserRole).includes(val.toUpperCase() as UserRole);
      },
      {
        message: ErrorMessageConstant.invalidRole,
        path: ["role"],
      }
    ),
});

const baseUserSchema = z.object(userFields);
export const createUserSchema = baseUserSchema;
export const updateUserSchema = baseUserSchema.partial().extend({
  id: z.number(),
});
