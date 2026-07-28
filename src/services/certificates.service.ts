import { randomBytes } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";

export interface CreateCertificateData {
  templateId: string;
}

export class CertificateTemplateNotFoundError extends Error {
  constructor() {
    super("Certificate template not found");
    this.name = "CertificateTemplateNotFoundError";
  }
}

export class CertificateTemplateInactiveError extends Error {
  constructor() {
    super("Certificate template is not active");
    this.name = "CertificateTemplateInactiveError";
  }
}

function generateCertificateCode(): string {
  return randomBytes(24).toString("base64url");
}

export async function createCertificate(
  data: CreateCertificateData,
) {
  const template =
    await prisma.certificateTemplate.findUnique({
      where: {
        id: data.templateId,
      },
    });

  if (!template) {
    throw new CertificateTemplateNotFoundError();
  }

  if (template.status !== "ACTIVE") {
    throw new CertificateTemplateInactiveError();
  }

  const issuedAt = new Date();

  const expiresAt = new Date(
    issuedAt.getTime() +
      template.validityDays * 24 * 60 * 60 * 1000,
  );

  const code = generateCertificateCode();

  return prisma.certificate.create({
    data: {
      templateId: template.id,
      code,

      title: template.title,
      description: template.description,
      terms: template.terms,

      issuedAt,
      expiresAt,
    },
  });
}


export class CertificateNotFoundError extends Error {
  constructor() {
    super("Certificate not found");
    this.name = "CertificateNotFoundError";
  }
}

export type CertificateEffectiveStatus =
  | "ACTIVE"
  | "REDEEMED"
  | "REVOKED"
  | "EXPIRED";

export async function verifyCertificate(code: string) {
  const certificate = await prisma.certificate.findUnique({
    where: {
      code,
    },
  });

  if (!certificate) {
    throw new CertificateNotFoundError();
  }

  const now = new Date();

  const effectiveStatus: CertificateEffectiveStatus =
    certificate.status === "ACTIVE" &&
    certificate.expiresAt <= now
      ? "EXPIRED"
      : certificate.status;

  const valid = effectiveStatus === "ACTIVE";

  return {
    valid,
    certificate: {
      code: certificate.code,
      title: certificate.title,
      description: certificate.description,
      terms: certificate.terms,
      status: effectiveStatus,
      issuedAt: certificate.issuedAt,
      expiresAt: certificate.expiresAt,
      redeemedAt: certificate.redeemedAt,
    },
  };
}


export class CertificateAlreadyRedeemedError extends Error {
  constructor() {
    super("Certificate has already been redeemed");
    this.name = "CertificateAlreadyRedeemedError";
  }
}

export class CertificateRevokedError extends Error {
  constructor() {
    super("Certificate has been revoked");
    this.name = "CertificateRevokedError";
  }
}

export class CertificateExpiredError extends Error {
  constructor() {
    super("Certificate has expired");
    this.name = "CertificateExpiredError";
  }
}

export interface RedeemCertificateData {
  code: string;
  operatorId: string;
}

export async function redeemCertificate(
  data: RedeemCertificateData,
) {
  const now = new Date();

  const result = await prisma.certificate.updateMany({
    where: {
      code: data.code,
      status: "ACTIVE",
      expiresAt: {
        gt: now,
      },
    },
    data: {
      status: "REDEEMED",
      redeemedAt: now,
      redeemedByOperatorId: data.operatorId,
    },
  });

  if (result.count === 1) {
    const certificate =
      await prisma.certificate.findUnique({
        where: {
          code: data.code,
        },
        include: {
          redeemedByOperator: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

    if (!certificate) {
      throw new CertificateNotFoundError();
    }

    return certificate;
  }

  const certificate =
    await prisma.certificate.findUnique({
      where: {
        code: data.code,
      },
    });

  if (!certificate) {
    throw new CertificateNotFoundError();
  }

  if (certificate.status === "REDEEMED") {
    throw new CertificateAlreadyRedeemedError();
  }

  if (certificate.status === "REVOKED") {
    throw new CertificateRevokedError();
  }

  if (certificate.expiresAt <= now) {
    throw new CertificateExpiredError();
  }

  throw new Error("Certificate could not be redeemed");
}


export type CertificateListStatus =
  | "ALL"
  | "ACTIVE"
  | "REDEEMED"
  | "REVOKED"
  | "EXPIRED";

export interface GetCertificatesOptions {
  status: CertificateListStatus;
  page: number;
  limit: number;
}

export async function getCertificates(
  options: GetCertificatesOptions,
) {
  const now = new Date();

  let where: Prisma.CertificateWhereInput = {};

  if (options.status === "ACTIVE") {
    where = {
      status: "ACTIVE",
      expiresAt: {
        gt: now,
      },
    };
  }

  if (options.status === "EXPIRED") {
    where = {
      status: "ACTIVE",
      expiresAt: {
        lte: now,
      },
    };
  }

  if (options.status === "REDEEMED") {
    where = {
      status: "REDEEMED",
    };
  }

  if (options.status === "REVOKED") {
    where = {
      status: "REVOKED",
    };
  }

  const skip = (options.page - 1) * options.limit;

  const [certificates, total] = await prisma.$transaction([
    prisma.certificate.findMany({
      where,
      orderBy: {
        issuedAt: "desc",
      },
      skip,
      take: options.limit,
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        terms: true,
        status: true,
        issuedAt: true,
        expiresAt: true,
        redeemedAt: true,

        template: {
          select: {
            id: true,
            code: true,
          },
        },

        redeemedByOperator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),

    prisma.certificate.count({
      where,
    }),
  ]);

  const items = certificates.map((certificate) => {
    const effectiveStatus: CertificateEffectiveStatus =
      certificate.status === "ACTIVE" &&
      certificate.expiresAt <= now
        ? "EXPIRED"
        : certificate.status;

    return {
      ...certificate,
      status: effectiveStatus,
    };
  });

  return {
    certificates: items,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit),
    },
  };
}