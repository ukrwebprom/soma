import { Router } from "express";
import {
  createCertificateController,
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

export default certificatesRouter;
