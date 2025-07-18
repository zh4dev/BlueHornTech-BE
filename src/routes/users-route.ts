import express from "express";
import { Request, Response } from "express";
import UsersController from "../controllers/users-controller";

const router = express.Router();
const usersController = new UsersController();
const apiPath = "/users";

router.get(apiPath, (req: Request, res: Response) => {
  usersController.getAll(req, res);
});

router.put(apiPath, (req: Request, res: Response) => {
  usersController.edit(req, res);
});

router.post(apiPath, (req: Request, res: Response) => {
  usersController.create(req, res);
});

router.delete(apiPath, (req: Request, res: Response) => {
  usersController.delete(req, res);
});

export default router;
