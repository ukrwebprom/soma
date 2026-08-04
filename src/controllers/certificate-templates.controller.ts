import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";

import {
  CertificateAssetUploadError,
  deleteCertificateAssets,
  uploadCertificateAsset,
} from "../services/certificate-assets.service.js";

import {
  createCertificateTemplate,
  getCertificateTemplates,
  updateCertificateTemplate,
} from "../services/certificate-templates.service.js";

const TEMPLATE_CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface CertificateTemplateFiles {
  coverPortrait?: Express.Multer.File[];
  coverLandscape?: Express.Multer.File[];
  logo?: Express.Multer.File[];
}

function isUniqueConstraintError(
  error: unknown,
): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

export async function createCertificateTemplateController(
  request: Request,
  response: Response,
): Promise<void> {
  const body = (request.body ?? {}) as Record<string, unknown>;

  const code =
    typeof body.code === "string"
      ? body.code.trim().toLowerCase()
      : "";

  const title =
    typeof body.title === "string"
      ? body.title.trim()
      : "";

  const description =
    typeof body.description === "string" &&
    body.description.trim()
      ? body.description.trim()
      : null;

  const terms =
    typeof body.terms === "string" &&
    body.terms.trim()
      ? body.terms.trim()
      : null;

  const instructionText =
    typeof body.instructionText === "string" &&
    body.instructionText.trim()
      ? body.instructionText.trim()
      : null;

  const validityDays =
    typeof body.validityDays === "string" ||
    typeof body.validityDays === "number"
      ? Number(body.validityDays)
      : Number.NaN;

  const files =
    request.files as CertificateTemplateFiles | undefined;

  const coverPortrait = files?.coverPortrait?.[0];
  const coverLandscape = files?.coverLandscape?.[0];
  const logo = files?.logo?.[0];

  if (!TEMPLATE_CODE_PATTERN.test(code) || code.length > 64) {
    response.status(400).json({
      error: "VALIDATION_ERROR",
      message:
        "Code may contain lowercase letters, numbers and hyphens",
    });

    return;
  }

  if (!title) {
    response.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Title is required",
    });

    return;
  }

  if (title.length > 150) {
    response.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Title must not exceed 150 characters",
    });

    return;
  }

  if (
    !Number.isInteger(validityDays) ||
    validityDays <= 0
  ) {
    response.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Validity days must be a positive integer",
    });

    return;
  }

  if (!coverPortrait) {
    response.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Portrait cover image is required",
    });

    return;
  }

  if (!coverLandscape) {
    response.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Landscape cover image is required",
    });

    return;
  }

  if (!logo) {
    response.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Logo image is required",
    });

    return;
  }

  const templateId = randomUUID();
  const uploadedPaths: string[] = [];

  try {
    const portraitAsset = await uploadCertificateAsset({
      templateId,
      kind: "cover-portrait",
      file: coverPortrait,
    });

    uploadedPaths.push(portraitAsset.storagePath);

    const landscapeAsset = await uploadCertificateAsset({
      templateId,
      kind: "cover-landscape",
      file: coverLandscape,
    });

    uploadedPaths.push(landscapeAsset.storagePath);

    const logoAsset = await uploadCertificateAsset({
      templateId,
      kind: "logo",
      file: logo,
    });

    uploadedPaths.push(logoAsset.storagePath);

    const certificateTemplate =
      await createCertificateTemplate({
        id: templateId,
        code,
        title,
        description,
        terms,
        instructionText,
        validityDays,

        coverPortraitUrl: portraitAsset.publicUrl,
        coverLandscapeUrl: landscapeAsset.publicUrl,
        logoUrl: logoAsset.publicUrl,
      });

    response.status(201).json({
      certificateTemplate,
    });
  } catch (error) {
    try {
      await deleteCertificateAssets(uploadedPaths);
    } catch (cleanupError) {
      console.error(
        "Failed to clean up certificate assets:",
        cleanupError,
      );
    }

    if (isUniqueConstraintError(error)) {
      response.status(409).json({
        error: "CERTIFICATE_TEMPLATE_CODE_ALREADY_EXISTS",
        message:
          "A certificate template with this code already exists",
      });

      return;
    }

    if (error instanceof CertificateAssetUploadError) {
      console.error(
        "Failed to upload certificate assets:",
        error,
      );

      response.status(502).json({
        error: "CERTIFICATE_ASSET_UPLOAD_FAILED",
        message:
          "Failed to upload certificate template images",
      });

      return;
    }

    console.error(
      "Failed to create certificate template:",
      error,
    );

    response.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to create certificate template",
    });
  }
}

export async function getCertificateTemplatesController(
  _request: Request,
  response: Response,
): Promise<void> {
  try {
    const certificateTemplates =
      await getCertificateTemplates();

    response.status(200).json({
      certificateTemplates,
    });
  } catch (error) {
    console.error(
      "Failed to get certificate templates:",
      error,
    );

    response.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to get certificate templates",
    });
  }
}

export async function updateCertificateTemplateController(
  request: Request,
  response: Response,
): Promise<void> {
  const id = typeof request.params.id === "string"
    ? request.params.id
    : "";
  const body = (request.body ?? {}) as Record<string, unknown>;
  const code = typeof body.code === "string"
    ? body.code.trim().toLowerCase()
    : "";
  const title = typeof body.title === "string"
    ? body.title.trim()
    : "";
  const description = typeof body.description === "string" && body.description.trim()
    ? body.description.trim()
    : null;
  const terms = typeof body.terms === "string" && body.terms.trim()
    ? body.terms.trim()
    : null;
  const instructionText =
    typeof body.instructionText === "string" && body.instructionText.trim()
      ? body.instructionText.trim()
      : null;
  const validityDays =
    typeof body.validityDays === "string" || typeof body.validityDays === "number"
      ? Number(body.validityDays)
      : Number.NaN;

  if (!id) {
    response.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Template id is required",
    });
    return;
  }

  if (!TEMPLATE_CODE_PATTERN.test(code) || code.length > 64) {
    response.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Code may contain lowercase letters, numbers and hyphens",
    });
    return;
  }

  if (!title || title.length > 150) {
    response.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Title is required and must not exceed 150 characters",
    });
    return;
  }

  if (!Number.isInteger(validityDays) || validityDays <= 0) {
    response.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Validity days must be a positive integer",
    });
    return;
  }

  const files = request.files as CertificateTemplateFiles | undefined;
  const uploads = [
    ["coverPortraitUrl", "cover-portrait", files?.coverPortrait?.[0]],
    ["coverLandscapeUrl", "cover-landscape", files?.coverLandscape?.[0]],
    ["logoUrl", "logo", files?.logo?.[0]],
  ] as const;
  const uploadedPaths: string[] = [];
  const assetUrls: Record<string, string> = {};

  try {
    for (const [field, kind, file] of uploads) {
      if (!file) continue;

      const asset = await uploadCertificateAsset({
        templateId: id,
        kind,
        file,
      });
      uploadedPaths.push(asset.storagePath);
      assetUrls[field] = asset.publicUrl;
    }

    const certificateTemplate = await updateCertificateTemplate(id, {
      code,
      title,
      description,
      terms,
      instructionText,
      validityDays,
      ...assetUrls,
    });

    response.status(200).json({ certificateTemplate });
  } catch (error) {
    try {
      await deleteCertificateAssets(uploadedPaths);
    } catch (cleanupError) {
      console.error("Failed to clean up certificate assets:", cleanupError);
    }

    if (isUniqueConstraintError(error)) {
      response.status(409).json({
        error: "CERTIFICATE_TEMPLATE_CODE_ALREADY_EXISTS",
        message: "A certificate template with this code already exists",
      });
      return;
    }

    if (error instanceof CertificateAssetUploadError) {
      response.status(502).json({
        error: "CERTIFICATE_ASSET_UPLOAD_FAILED",
        message: "Failed to upload certificate template images",
      });
      return;
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "P2025"
    ) {
      response.status(404).json({
        error: "CERTIFICATE_TEMPLATE_NOT_FOUND",
        message: "Certificate template not found",
      });
      return;
    }

    console.error("Failed to update certificate template:", error);
    response.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to update certificate template",
    });
  }
}
