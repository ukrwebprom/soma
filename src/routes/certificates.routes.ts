import { Router } from "express";
import {
  createCertificateController,
  createCertificatesBatchController,
  getCertificateController,
  getCertificatesController,
} from "../controllers/certificates.controller.js";

const certificatesRouter = Router();

certificatesRouter.get(
  "/",
  getCertificatesController,
);

certificatesRouter.post(
  "/batch",
  createCertificatesBatchController,
);

certificatesRouter.post(
  "/",
  createCertificateController,
);

certificatesRouter.get(
  "/:id",
  getCertificateController,
);

export default certificatesRouter;
