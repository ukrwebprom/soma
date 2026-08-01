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

export class OperatorPinGenerationError
  extends Error {
  constructor() {
    super(
      "Failed to generate a unique operator PIN",
    );

    this.name = "OperatorPinGenerationError";
  }
}

export class OperatorNotFoundError
  extends Error {
  constructor() {
    super("Operator not found");
    this.name = "OperatorNotFoundError";
  }
}

export class InvalidOperatorPinError
  extends Error {
  constructor() {
    super("Invalid operator PIN");
    this.name = "InvalidOperatorPinError";
  }
}

function isPrismaErrorWithCode(
  error: unknown,
  code: string,
): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}

async function generateUniquePinData(): Promise<{
  pin: string;
  pinLookup: string;
  pinHash: string;
}> {
  const pin = generateOperatorPin();

  return {
    pin,
    pinLookup: createPinLookup(pin),
    pinHash: await hashPin(pin),
  };
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
    const {
      pin,
      pinLookup,
      pinHash,
    } = await generateUniquePinData();

    try {
      const operator =
        await prisma.operator.create({
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
      if (
        isPrismaErrorWithCode(
          error,
          "P2002",
        )
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new OperatorPinGenerationError();
}

export async function getOperators() {
  const operators =
    await prisma.operator.findMany({
      orderBy: [
        {
          isActive: "desc",
        },
        {
          name: "asc",
        },
      ],

      select: {
        id: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,

        _count: {
          select: {
            redeemedCertificates: true,
          },
        },
      },
    });

  return operators.map(
    ({ _count, ...operator }) => ({
      ...operator,

      redeemedCertificatesCount:
        _count.redeemedCertificates,
    }),
  );
}

export async function setOperatorActive(
  operatorId: string,
  isActive: boolean,
) {
  try {
    return await prisma.operator.update({
      where: {
        id: operatorId,
      },

      data: {
        isActive,
      },

      select: {
        id: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    if (
      isPrismaErrorWithCode(
        error,
        "P2025",
      )
    ) {
      throw new OperatorNotFoundError();
    }

    throw error;
  }
}

export async function resetOperatorPin(
  operatorId: string,
) {
  const maximumAttempts = 20;

  for (
    let attempt = 0;
    attempt < maximumAttempts;
    attempt += 1
  ) {
    const {
      pin,
      pinLookup,
      pinHash,
    } = await generateUniquePinData();

    try {
      const operator =
        await prisma.operator.update({
          where: {
            id: operatorId,
          },

          data: {
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
      if (
        isPrismaErrorWithCode(
          error,
          "P2002",
        )
      ) {
        continue;
      }

      if (
        isPrismaErrorWithCode(
          error,
          "P2025",
        )
      ) {
        throw new OperatorNotFoundError();
      }

      throw error;
    }
  }

  throw new OperatorPinGenerationError();
}

export async function getActiveOperatorByPin(
  pin: string,
) {
  const pinLookup = createPinLookup(pin);

  const operator =
    await prisma.operator.findUnique({
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

  if (
    !operator ||
    !operator.isActive
  ) {
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