import type {
  Request,
  Response,
} from "express";

import {
  createOperator,
  getOperators,
  OperatorNotFoundError,
  OperatorPinAlreadyInUseError,
  OperatorPinGenerationError,
  resetOperatorPin,
  setOperatorActive,
} from "../services/operators.service.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getOperatorId(
  request: Request,
): string {
  return typeof request.params.id === "string"
    ? request.params.id.trim()
    : "";
}

function validateOperatorId(
  operatorId: string,
  response: Response,
): boolean {
  if (
    !operatorId ||
    !UUID_PATTERN.test(operatorId)
  ) {
    response.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Invalid operator ID",
    });

    return false;
  }

  return true;
}

export async function getOperatorsController(
  _request: Request,
  response: Response,
): Promise<void> {
  try {
    const operators =
      await getOperators();

    response.status(200).json({
      operators,
    });
  } catch (error) {
    console.error(
      "Failed to get operators:",
      error,
    );

    response.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to get operators",
    });
  }
}

export async function createOperatorController(
  request: Request,
  response: Response,
): Promise<void> {
  const body =
    (request.body ?? {}) as Record<
      string,
      unknown
    >;

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
      message:
        "Operator name must not exceed 100 characters",
    });

    return;
  }

  try {
    const result =
      await createOperator({
        name,
      });

    response.status(201).json(result);
  } catch (error) {
    if (
      error instanceof
      OperatorPinGenerationError
    ) {
      response.status(500).json({
        error:
          "OPERATOR_PIN_GENERATION_FAILED",

        message:
          "Failed to generate a unique operator PIN",
      });

      return;
    }

    console.error(
      "Failed to create operator:",
      error,
    );

    response.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to create operator",
    });
  }
}

export async function setOperatorStatusController(
  request: Request,
  response: Response,
): Promise<void> {
  const operatorId =
    getOperatorId(request);

  if (
    !validateOperatorId(
      operatorId,
      response,
    )
  ) {
    return;
  }

  const body =
    (request.body ?? {}) as Record<
      string,
      unknown
    >;

  if (
    typeof body.isActive !== "boolean"
  ) {
    response.status(400).json({
      error: "VALIDATION_ERROR",

      message:
        "isActive must be a boolean",
    });

    return;
  }

  try {
    const operator =
      await setOperatorActive(
        operatorId,
        body.isActive,
      );

    response.status(200).json({
      operator,
    });
  } catch (error) {
    if (
      error instanceof
      OperatorNotFoundError
    ) {
      response.status(404).json({
        error: "OPERATOR_NOT_FOUND",
        message: "Operator not found",
      });

      return;
    }

    console.error(
      "Failed to update operator status:",
      error,
    );

    response.status(500).json({
      error: "INTERNAL_SERVER_ERROR",

      message:
        "Failed to update operator status",
    });
  }
}

export async function resetOperatorPinController(
  request: Request,
  response: Response,
): Promise<void> {
  const operatorId =
    getOperatorId(request);

  if (
    !validateOperatorId(
      operatorId,
      response,
    )
  ) {
    return;
  }

  const body =
    (request.body ?? {}) as Record<
      string,
      unknown
    >;

  const requestedPin =
    typeof body.pin === "string"
      ? body.pin.trim()
      : undefined;

  if (
    requestedPin !== undefined &&
    !/^\d{4}$/.test(requestedPin)
  ) {
    response.status(400).json({
      error: "VALIDATION_ERROR",
      message: "PIN must contain exactly 4 digits",
    });

    return;
  }

  try {
    const result =
      await resetOperatorPin(
        operatorId,
        requestedPin,
      );

    response.status(200).json(result);
  } catch (error) {
    if (
      error instanceof
      OperatorNotFoundError
    ) {
      response.status(404).json({
        error: "OPERATOR_NOT_FOUND",
        message: "Operator not found",
      });

      return;
    }

    if (
      error instanceof
      OperatorPinGenerationError
    ) {
      response.status(500).json({
        error:
          "OPERATOR_PIN_GENERATION_FAILED",

        message:
          "Failed to generate a unique operator PIN",
      });

      return;
    }

    if (
      error instanceof
      OperatorPinAlreadyInUseError
    ) {
      response.status(409).json({
        error: "OPERATOR_PIN_ALREADY_IN_USE",
        message: "Operator PIN is already in use",
      });

      return;
    }

    console.error(
      "Failed to reset operator PIN:",
      error,
    );

    response.status(500).json({
      error: "INTERNAL_SERVER_ERROR",

      message:
        "Failed to reset operator PIN",
    });
  }
}
