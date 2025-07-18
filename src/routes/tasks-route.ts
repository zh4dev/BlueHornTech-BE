import express from "express";
import { Request, Response } from "express";
import TasksController from "../controllers/tasks-controller";

const router = express.Router();
const taskController = new TasksController();
const apiPath = "/tasks";

router.put(`${apiPath}/:id`, (req: Request, res: Response) => {
  taskController.updateTaskStatus(req, res);
});

router.post(apiPath, (req: Request, res: Response) => {
  taskController.create(req, res);
});

export default router;
