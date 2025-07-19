export type AllowedModels = "user" | "schedule" | "visitLog" | "task";
export type ScheduleStatusType =
  | "completed"
  | "missed"
  | "in-progress"
  | "upcoming"
  | "started";

export enum PrismaError {
  invalid = "Invalid",
  findFirst = "findFirst",
  update = "update",
}

export enum ServerCode {
  success = 200,
  created = 201,
  badRequest = 400,
  unAuthorized = 401,
  forbidden = 403,
  notFound = 404,
  conflict = 409,
  tooManyRequests = 429,
  serverError = 500,
}
