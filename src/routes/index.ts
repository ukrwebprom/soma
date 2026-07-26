import { Router } from "express";
import healthRouter from "./health.routes.js";
import organizationsRouter from "./organizations.routes.js";

const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use(
  "/admin/organizations",
  organizationsRouter,
);

export default apiRouter;