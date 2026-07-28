import type { Request, Response } from "express";
import {
  createOperator,
  OperatorPinGenerationError,
} from "../services/operators.service.js";

export async function createOperatorController(
  request: Request,
  response: Response,
): Promise<void> {
  const body = (request.body ?? {}) as Record<string, unknown>;

  const name =
    typeof body.name === "string"
      ? body.name.trim()
      : "";

  if (!name) {
    response.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Operator name is required",
    });

    return;
  }

  if (name.length > 100) {
    response.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Operator name must not exceed 100 characters",
    });

    return;
  }

  try {
    const result = await createOperator({
      name,
    });

    response.status(201).json(result);
  } catch (error) {
    if (error instanceof OperatorPinGenerationError) {
      response.status(500).json({
        error: "OPERATOR_PIN_GENERATION_FAILED",
        message:
          "Failed to generate a unique operator PIN",
      });

      return;
    }

    console.error("Failed to create operator:", error);

    response.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to create operator",
    });
  }
}