import {
  createPinLookup,
  generateOperatorPin,
  hashPin,
  verifyPin,
} from "../lib/operator-pin.js";
import { prisma } from "../lib/prisma.js";

export interface CreateOperatorData {
  name: string;
}

export class OperatorPinGenerationError extends Error {
  constructor() {
    super("Failed to generate a unique operator PIN");
    this.name = "OperatorPinGenerationError";
  }
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

export async function createOperator(
  data: CreateOperatorData,
) {
  const maximumAttempts = 20;

  for (
    let attempt = 0;
    attempt < maximumAttempts;
    attempt += 1
  ) {
    const pin = generateOperatorPin();
    const pinLookup = createPinLookup(pin);
    const pinHash = await hashPin(pin);

    try {
      const operator = await prisma.operator.create({
        data: {
          name: data.name,
          pinLookup,
          pinHash,
        },
        select: {
          id: true,
          name: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        operator,
        pin,
      };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        continue;
      }

      throw error;
    }
  }

  throw new OperatorPinGenerationError();
}

export class InvalidOperatorPinError extends Error {
  constructor() {
    super("Invalid operator PIN");
    this.name = "InvalidOperatorPinError";
  }
}

export async function getActiveOperatorByPin(
  pin: string,
) {
  const pinLookup = createPinLookup(pin);

  const operator = await prisma.operator.findUnique({
    where: {
      pinLookup,
    },
    select: {
      id: true,
      name: true,
      pinHash: true,
      isActive: true,
    },
  });

  if (!operator || !operator.isActive) {
    throw new InvalidOperatorPinError();
  }

  const pinIsValid = await verifyPin(
    pin,
    operator.pinHash,
  );

  if (!pinIsValid) {
    throw new InvalidOperatorPinError();
  }

  return {
    id: operator.id,
    name: operator.name,
  };
}