import type { Request, Response } from "express";
import { createCertificateTemplate } from "../services/certificate-templates.service.js";

const TEMPLATE_CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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
    typeof body.description === "string"
      ? body.description.trim()
      : null;

  const terms =
    typeof body.terms === "string"
      ? body.terms.trim()
      : null;

  const validityDays = body.validityDays;

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
    typeof validityDays !== "number" ||
    !Number.isInteger(validityDays) ||
    validityDays <= 0
  ) {
    response.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Validity days must be a positive integer",
    });

    return;
  }

  try {
    const certificateTemplate = await createCertificateTemplate({
      code,
      title,
      description,
      terms,
      validityDays,
    });

    response.status(201).json({
      certificateTemplate,
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      response.status(409).json({
        error: "CERTIFICATE_TEMPLATE_CODE_ALREADY_EXISTS",
        message:
          "A certificate template with this code already exists",
      });

      return;
    }

    console.error("Failed to create certificate template:", error);

    response.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to create certificate template",
    });
  }
}