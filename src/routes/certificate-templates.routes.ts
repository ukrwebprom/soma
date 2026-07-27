import { Router } from "express";
import {
  createCertificateTemplateController,
  getCertificateTemplatesController,
} from "../controllers/certificate-templates.controller.js";

const certificateTemplatesRouter = Router();

certificateTemplatesRouter.get(
  "/",
  getCertificateTemplatesController,
);

certificateTemplatesRouter.post(
  "/",
  createCertificateTemplateController,
);

export default certificateTemplatesRouter;