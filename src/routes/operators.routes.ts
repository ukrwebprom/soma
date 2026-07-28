
import { Router } from "express";
import { createOperatorController } from "../controllers/operators.controller.js";

const operatorsRouter = Router();

operatorsRouter.post(
  "/",
  createOperatorController,
);

export default operatorsRouter;