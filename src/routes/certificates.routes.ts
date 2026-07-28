import { Router } from "express";
import {
  createCertificateController,
  redeemCertificateController,
  getCertificatesController,
} from "../controllers/certificates.controller.js";

const certificatesRouter = Router();

certificatesRouter.get(
  "/",
  getCertificatesController,
);

certificatesRouter.post(
  "/",
  createCertificateController,
);

certificatesRouter.post(
  "/:code/redeem",
  redeemCertificateController,
);

export default certificatesRouter;