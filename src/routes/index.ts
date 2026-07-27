import { Router } from "express";
import healthRouter from "./health.routes.js";
import certificateTemplatesRouter from "./certificate-templates.routes.js";

const apiRouter = Router();

apiRouter.use("/health", healthRouter);

apiRouter.use(
  "/admin/certificate-templates",
  certificateTemplatesRouter,
);


export default apiRouter;