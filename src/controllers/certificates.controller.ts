import type { Request, Response } from "express";
import {
  CertificateAlreadyRedeemedError,
  CertificateExpiredError,
  CertificateNotFoundError,
  CertificateRevokedError,
  CertificateTemplateInactiveError,
  CertificateTemplateNotFoundError,
  createCertificate,
  redeemCertificate,
  verifyCertificate,
  getCertificates,
  type CertificateListStatus,
} from "../services/certificates.service.js";

import {
  getActiveOperatorByPin,
  InvalidOperatorPinError,
} from "../services/operators.service.js";

import {
  CertificateImageAssetError,
  CertificateImageNotFoundError,
  generateCertificateImage,
  type CertificateImageLayout,
} from "../services/certificate-image.service.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PIN_PATTERN = /^\d{4}$/;

const CERTIFICATE_LIST_STATUSES =
  new Set<CertificateListStatus>([
    "ALL",
    "ACTIVE",
    "REDEEMED",
    "REVOKED",
    "EXPIRED",
  ]);

function isCertificateListStatus(
  value: string,
): value is CertificateListStatus {
  return CERTIFICATE_LIST_STATUSES.has(
    value as CertificateListStatus,
  );
}

export async function createCertificateController(
  request: Request,
  response: Response,
): Promise<void> {
  const body = (request.body ?? {}) as Record<string, unknown>;

  const templateId =
    typeof body.templateId === "string"
      ? body.templateId.trim()
      : "";

  if (!UUID_PATTERN.test(templateId)) {
    response.status(400).json({
      error: "VALIDATION_ERROR",
      message: "A valid templateId is required",
    });

    return;
  }

  try {
    const certificate = await createCertificate({
      templateId,
    });

    response.status(201).json({
      certificate,
    });
  } catch (error) {
    if (error instanceof CertificateTemplateNotFoundError) {
      response.status(404).json({
        error: "CERTIFICATE_TEMPLATE_NOT_FOUND",
        message: "Certificate template not found",
      });

      return;
    }

    if (error instanceof CertificateTemplateInactiveError) {
      response.status(409).json({
        error: "CERTIFICATE_TEMPLATE_INACTIVE",
        message:
          "Certificates cannot be issued from an inactive template",
      });

      return;
    }

    console.error("Failed to create certificate:", error);

    response.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to create certificate",
    });
  }
}



const CERTIFICATE_CODE_PATTERN =
  /^[A-Za-z0-9_-]{20,64}$/;

export async function verifyCertificateController(
  request: Request,
  response: Response,
): Promise<void> {
  const code =
    typeof request.params.code === "string"
      ? request.params.code.trim()
      : "";

  if (!CERTIFICATE_CODE_PATTERN.test(code)) {
    response.status(400).json({
      error: "VALIDATION_ERROR",
      message: "A valid certificate code is required",
    });

    return;
  }

  try {
    const verification = await verifyCertificate(code);

    response.status(200).json(verification);
  } catch (error) {
    if (error instanceof CertificateNotFoundError) {
      response.status(404).json({
        valid: false,
        error: "CERTIFICATE_NOT_FOUND",
        message: "Certificate not found",
      });

      return;
    }

    console.error("Failed to verify certificate:", error);

    response.status(500).json({
      valid: false,
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to verify certificate",
    });
  }
}


export async function redeemCertificateController(
  request: Request,
  response: Response,
): Promise<void> {
  const code =
    typeof request.params.code === "string"
      ? request.params.code.trim()
      : "";

  const body = (request.body ?? {}) as Record<string, unknown>;

  const pin =
    typeof body.pin === "string"
      ? body.pin.trim()
      : "";

  if (!CERTIFICATE_CODE_PATTERN.test(code)) {
    response.status(400).json({
      redeemed: false,
      error: "VALIDATION_ERROR",
      message: "A valid certificate code is required",
    });

    return;
  }

  if (!PIN_PATTERN.test(pin)) {
    response.status(400).json({
      redeemed: false,
      error: "VALIDATION_ERROR",
      message: "PIN must contain exactly 4 digits",
    });

    return;
  }

  try {
    const operator = await getActiveOperatorByPin(pin);

    const certificate = await redeemCertificate({
      code,
      operatorId: operator.id,
    });

    response.status(200).json({
      redeemed: true,
      certificate: {
        code: certificate.code,
        title: certificate.title,
        status: certificate.status,
        expiresAt: certificate.expiresAt,
        redeemedAt: certificate.redeemedAt,
        redeemedByOperator: certificate.redeemedByOperator,
      },
    });
  } catch (error) {
    if (error instanceof InvalidOperatorPinError) {
      response.status(401).json({
        redeemed: false,
        error: "INVALID_OPERATOR_PIN",
        message: "Invalid operator PIN",
      });

      return;
    }

    if (error instanceof CertificateNotFoundError) {
      response.status(404).json({
        redeemed: false,
        error: "CERTIFICATE_NOT_FOUND",
        message: "Certificate not found",
      });

      return;
    }

    if (error instanceof CertificateAlreadyRedeemedError) {
      response.status(409).json({
        redeemed: false,
        error: "CERTIFICATE_ALREADY_REDEEMED",
        message: "Certificate has already been redeemed",
      });

      return;
    }

    if (error instanceof CertificateRevokedError) {
      response.status(409).json({
        redeemed: false,
        error: "CERTIFICATE_REVOKED",
        message: "Certificate has been revoked",
      });

      return;
    }

    if (error instanceof CertificateExpiredError) {
      response.status(409).json({
        redeemed: false,
        error: "CERTIFICATE_EXPIRED",
        message: "Certificate has expired",
      });

      return;
    }

    console.error("Failed to redeem certificate:", error);

    response.status(500).json({
      redeemed: false,
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to redeem certificate",
    });
  }
}

export async function getCertificatesController(
  request: Request,
  response: Response,
): Promise<void> {
  const statusValue =
    typeof request.query.status === "string"
      ? request.query.status.trim().toUpperCase()
      : "ALL";

  const pageValue =
    typeof request.query.page === "string"
      ? request.query.page
      : "1";

  const limitValue =
    typeof request.query.limit === "string"
      ? request.query.limit
      : "20";

  if (!isCertificateListStatus(statusValue)) {
    response.status(400).json({
      error: "VALIDATION_ERROR",
      message:
        "Status must be ALL, ACTIVE, REDEEMED, REVOKED or EXPIRED",
    });

    return;
  }

  const page = Number(pageValue);
  const limit = Number(limitValue);

  if (!Number.isInteger(page) || page < 1) {
    response.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Page must be a positive integer",
    });

    return;
  }

  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    response.status(400).json({
      error: "VALIDATION_ERROR",
      message:
        "Limit must be an integer between 1 and 100",
    });

    return;
  }

  try {
    const result = await getCertificates({
      status: statusValue,
      page,
      limit,
    });

    response.status(200).json(result);
  } catch (error) {
    console.error("Failed to get certificates:", error);

    response.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to get certificates",
    });
  }
}

export async function getCertificateImageController(
  request: Request,
  response: Response,
): Promise<void> {
  const code =
    typeof request.params.code === "string"
      ? request.params.code.trim()
      : "";

  const layoutQuery =
    typeof request.query.layout === "string"
      ? request.query.layout.toUpperCase()
      : "PORTRAIT";

  if (!code) {
    response.status(400).json({
      error: "CERTIFICATE_CODE_REQUIRED",
      message: "Certificate code is required",
    });

    return;
  }

  if (
    layoutQuery !== "PORTRAIT" &&
    layoutQuery !== "LANDSCAPE"
  ) {
    response.status(400).json({
      error: "INVALID_CERTIFICATE_LAYOUT",
      message:
        "Layout must be PORTRAIT or LANDSCAPE",
    });

    return;
  }

  try {
    const layout =
      layoutQuery as CertificateImageLayout;

    const image =
      await generateCertificateImage(
        code,
        layout,
      );

    const fileLayout =
      layout === "LANDSCAPE"
        ? "landscape"
        : "portrait";

    response.set({
      "Content-Type": "image/png",

      "Content-Disposition":
        `inline; filename="certificate-${fileLayout}.png"`,

      "Content-Length":
        String(image.length),

      "Cache-Control":
        "private, max-age=300",
    });

    response.status(200).send(image);
  } catch (error) {
    if (
      error instanceof
      CertificateImageNotFoundError
    ) {
      response.status(404).json({
        error: "CERTIFICATE_NOT_FOUND",
        message: "Certificate not found",
      });

      return;
    }

    if (
      error instanceof
      CertificateImageAssetError
    ) {
      console.error(
        "Certificate image asset error:",
        error,
      );

      response.status(422).json({
        error:
          "CERTIFICATE_IMAGE_ASSET_ERROR",
        message: error.message,
      });

      return;
    }

    console.error(
      "Failed to generate certificate image:",
      error,
    );

    response.status(500).json({
      error:
        "CERTIFICATE_IMAGE_GENERATION_FAILED",

      message:
        "Failed to generate certificate image",
    });
  }
}