import { Router } from "express";
import healthRouter from "./health.routes.js";
import certificateTemplatesRouter from "./certificate-templates.routes.js";
import certificatesRouter from "./certificates.routes.js";
import publicCertificatesRouter from "./public-certificates.routes.js";
import operatorsRouter from "./operators.routes.js";

const apiRouter = Router();

apiRouter.use("/health", healthRouter);

apiRouter.use(
  "/admin/certificate-templates",
  certificateTemplatesRouter,
);

apiRouter.use(
  "/admin/certificates",
  certificatesRouter,
);

apiRouter.use(
  "/certificates",
  publicCertificatesRouter,
);

apiRouter.use(
  "/admin/operators",
  operatorsRouter,
);


export default apiRouter;