import { Router } from "express";
import { createCertificateTemplateController } from "../controllers/certificate-templates.controller.js";

const certificateTemplatesRouter = Router();

certificateTemplatesRouter.post(
  "/",
  createCertificateTemplateController,
);

export default certificateTemplatesRouter;