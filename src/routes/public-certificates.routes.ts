import { Router } from "express";
import { verifyCertificateController } from "../controllers/certificates.controller.js";

const publicCertificatesRouter = Router();

publicCertificatesRouter.get(
  "/verify/:code",
  verifyCertificateController,
);

export default publicCertificatesRouter;