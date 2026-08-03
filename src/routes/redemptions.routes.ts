import { Router } from "express";

import { getRedemptionsController } from
  "../controllers/redemptions.controller.js";

const redemptionsRouter = Router();

redemptionsRouter.get(
  "/",
  getRedemptionsController,
);

export default redemptionsRouter;
