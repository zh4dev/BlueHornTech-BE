import express from "express";
import { Request, Response } from "express";
import SchedulesController from "../controllers/schedules-controller";

const router = express.Router();
const scheduleController = new SchedulesController();
const apiPath = "/schedules";

router.post(`${apiPath}/reset-generate`, (req: Request, res: Response) => {
  scheduleController.resetAndGenerateData(req, res);
});

router.get(apiPath, (req: Request, res: Response) => {
  scheduleController.getAll(req, res);
});

router.put(`${apiPath}/:id`, (req: Request, res: Response) => {
  scheduleController.edit(req, res);
});

router.post(apiPath, (req: Request, res: Response) => {
  scheduleController.create(req, res);
});

router.post(`${apiPath}/started`, (req: Request, res: Response) => {
  scheduleController.getStartedSchedule(req, res);
});

router.delete(apiPath, (req: Request, res: Response) => {
  scheduleController.delete(req, res);
});

router.get(`${apiPath}/:id`, (req: Request, res: Response) => {
  scheduleController.getDetail(req, res);
});

router.put(`${apiPath}/:id/cancel`, (req: Request, res: Response) => {
  scheduleController.cancelVisit(req, res);
});

router.post(`${apiPath}/:id/start`, (req: Request, res: Response) => {
  scheduleController.startVisit(req, res);
});

router.post(`${apiPath}/:id/end`, (req: Request, res: Response) => {
  scheduleController.endVisit(req, res);
});

export default router;
