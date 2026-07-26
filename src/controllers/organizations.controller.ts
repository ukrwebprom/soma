import type { Request, Response } from "express";
import { createOrganization } from "../services/organizations.service.js";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

export async function createOrganizationController(
  request: Request,
  response: Response,
): Promise<void> {
  const name =
    typeof request.body.name === "string"
      ? request.body.name.trim()
      : "";

  const slug =
    typeof request.body.slug === "string"
      ? request.body.slug.trim().toLowerCase()
      : "";

  if (!name) {
    response.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Organization name is required",
    });

    return;
  }

  if (name.length > 150) {
    response.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Organization name must not exceed 150 characters",
    });

    return;
  }

  if (!SLUG_PATTERN.test(slug) || slug.length > 64) {
    response.status(400).json({
      error: "VALIDATION_ERROR",
      message:
        "Slug may contain lowercase letters, numbers and hyphens",
    });

    return;
  }

  try {
    const organization = await createOrganization({
      name,
      slug,
    });

    response.status(201).json({
      organization,
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      response.status(409).json({
        error: "ORGANIZATION_SLUG_ALREADY_EXISTS",
        message: "An organization with this slug already exists",
      });

      return;
    }

    console.error("Failed to create organization:", error);

    response.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to create organization",
    });
  }
}