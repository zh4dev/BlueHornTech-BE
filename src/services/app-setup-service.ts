import { Router } from "express";
import userRoute from "../routes/users-route";
import schedulesRoute from "../routes/schedules-route";
import tasksRoute from "../routes/tasks-route";

export default class AppSetupService {
  public static getRouter(): Router {
    const router = Router();
    [userRoute, schedulesRoute, tasksRoute].forEach((r) => {
      router.use("", r!);
    });

    return router;
  }
}
