import { Router } from "express";
import {
  createCertificateTemplateController,
  getCertificateTemplatesController,
} from "../controllers/certificate-templates.controller.js";

import { certificateTemplateUpload } from "../middleware/certificate-template-upload.js";

const certificateTemplatesRouter = Router();

certificateTemplatesRouter.get(
  "/",
  getCertificateTemplatesController,
);

certificateTemplatesRouter.post(
  "/",
  certificateTemplateUpload,
  createCertificateTemplateController,
);

export default certificateTemplatesRouter;