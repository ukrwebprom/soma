import { Router } from "express";
import {
  getCertificateImageController,
  redeemCertificateController,
  verifyCertificateController,
} from "../controllers/certificates.controller.js";

const publicCertificatesRouter = Router();

publicCertificatesRouter.get(
  "/verify/:code",
  verifyCertificateController,
);

publicCertificatesRouter.post(
  "/:code/redeem",
  redeemCertificateController,
);

publicCertificatesRouter.get(
  "/:code/image",
  getCertificateImageController,
);

export default publicCertificatesRouter;
