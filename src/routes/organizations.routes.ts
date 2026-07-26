import { Router } from "express";
import { createOrganizationController } from "../controllers/organizations.controller.js";

const organizationsRouter = Router();

organizationsRouter.post(
  "/",
  createOrganizationController,
);

export default organizationsRouter;