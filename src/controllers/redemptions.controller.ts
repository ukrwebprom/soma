import type {
  Request,
  Response,
} from "express";

import { getRedemptions } from
  "../services/redemptions.service.js";

function parsePositiveInteger(
  value: unknown,
  fallback: number,
) {
  if (typeof value !== "string") {
    return fallback;
  }

  const parsedValue = Number.parseInt(value, 10);

  return Number.isInteger(parsedValue) &&
    parsedValue > 0
    ? parsedValue
    : fallback;
}

export async function getRedemptionsController(
  request: Request,
  response: Response,
): Promise<void> {
  const page = parsePositiveInteger(
    request.query.page,
    1,
  );
  const limit = Math.min(
    parsePositiveInteger(
      request.query.limit,
      30,
    ),
    100,
  );

  const fromValue =
    typeof request.query.from === "string"
      ? request.query.from
      : undefined;
  const toValue =
    typeof request.query.to === "string"
      ? request.query.to
      : undefined;
  const from = fromValue
    ? new Date(fromValue)
    : undefined;
  const to = toValue
    ? new Date(toValue)
    : undefined;

  if (
    (from && Number.isNaN(from.getTime())) ||
    (to && Number.isNaN(to.getTime()))
  ) {
    response.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Invalid redemption date range",
    });

    return;
  }

  if (from && to && from > to) {
    response.status(400).json({
      error: "VALIDATION_ERROR",
      message:
        "The start date must not be after the end date",
    });

    return;
  }

  try {
    const result = await getRedemptions({
      page,
      limit,
      from,
      to,
    });

    response.status(200).json(result);
  } catch (error) {
    console.error(
      "Failed to get redemptions:",
      error,
    );

    response.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to get redemptions",
    });
  }
}
