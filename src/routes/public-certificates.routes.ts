import { Router } from "express";
import { verifyCertificateController, getCertificateImageController } from "../controllers/certificates.controller.js";

const publicCertificatesRouter = Router();

publicCertificatesRouter.get(
  "/verify/:code",
  verifyCertificateController,
);

publicCertificatesRouter.get(
  "/:code/image",
  getCertificateImageController,
);

export default publicCertificatesRouter;