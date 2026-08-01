import { Router } from "express";

import {
  createOperatorController,
  getOperatorsController,
  resetOperatorPinController,
  setOperatorStatusController,
} from "../controllers/operators.controller.js";

const operatorsRouter = Router();

operatorsRouter.get(
  "/",
  getOperatorsController,
);

operatorsRouter.post(
  "/",
  createOperatorController,
);

operatorsRouter.patch(
  "/:id/status",
  setOperatorStatusController,
);

operatorsRouter.post(
  "/:id/reset-pin",
  resetOperatorPinController,
);

export default operatorsRouter;