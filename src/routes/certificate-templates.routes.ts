import { Router } from "express";
import {
  createCertificateTemplateController,
  getCertificateTemplatesController,
  updateCertificateTemplateController,
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

certificateTemplatesRouter.patch(
  "/:id",
  certificateTemplateUpload,
  updateCertificateTemplateController,
);

export default certificateTemplatesRouter;
