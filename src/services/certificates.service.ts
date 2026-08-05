import { randomBytes, randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import { ISSUE_SOURCES } from "../constants/issue-sources.js";

export interface CreateCertificateData {
  templateId: string;
  issueReason: string;
  issueComment?: string;
}

export interface CreateCertificatesBatchData
  extends CreateCertificateData {
  quantity: number;
}

export interface CreateGameCertificateData {
  templateId: string;
  sourceEventId?: string;
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

function getCertificateSnapshot(
  template: Prisma.CertificateTemplateGetPayload<object>,
  issuedAt: Date,
) {
  return {
    templateId: template.id,
    code: generateCertificateCode(),
    title: template.title,
    description: template.description,
    terms: template.terms,
    instructionText: template.instructionText,
    coverPortraitUrl: template.coverPortraitUrl,
    coverLandscapeUrl: template.coverLandscapeUrl,
    logoUrl: template.logoUrl,
    issuedAt,
    expiresAt: new Date(
      issuedAt.getTime() +
        template.validityDays * 24 * 60 * 60 * 1000,
    ),
  };
}

async function getActiveTemplate(templateId: string) {
  const template = await prisma.certificateTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    throw new CertificateTemplateNotFoundError();
  }

  if (template.status !== "ACTIVE") {
    throw new CertificateTemplateInactiveError();
  }

  return template;
}

export async function createCertificate(
  data: CreateCertificateData,
) {
  const template = await getActiveTemplate(data.templateId);
  const issuedAt = new Date();

  return prisma.certificate.create({
    data: {
      ...getCertificateSnapshot(template, issuedAt),
      issueSource: ISSUE_SOURCES.MANUAL,
      issueReason: data.issueReason,
      issueComment: data.issueComment ?? null,
      issueGroupId: null,
      sourceEventId: null,
    },
  });
}

export async function createCertificatesBatch(
  data: CreateCertificatesBatchData,
) {
  const template = await getActiveTemplate(data.templateId);
  const issueGroupId = randomUUID();

  const certificatesData = Array.from(
    { length: data.quantity },
    () => ({
      ...getCertificateSnapshot(template, new Date()),
      issueSource: ISSUE_SOURCES.MANUAL,
      issueReason: data.issueReason,
      issueComment: data.issueComment ?? null,
      issueGroupId,
      sourceEventId: null,
    }),
  );

  const certificates = await prisma.$transaction(async (tx) => {
    await tx.certificate.createMany({ data: certificatesData });

    return tx.certificate.findMany({
      where: { issueGroupId },
      orderBy: { issuedAt: "asc" },
      select: { id: true, code: true },
    });
  });

  return { issueGroupId, quantity: certificates.length, certificates };
}

export async function createGameCertificate(
  data: CreateGameCertificateData,
) {
  if (data.sourceEventId) {
    const existing = await prisma.certificate.findUnique({
      where: {
        issueSource_sourceEventId: {
          issueSource: ISSUE_SOURCES.GAME_NEMO_SUPERSTAR,
          sourceEventId: data.sourceEventId,
        },
      },
    });

    if (existing) return { certificate: existing, idempotent: true };
  }

  const template = await getActiveTemplate(data.templateId);

  try {
    const certificate = await prisma.certificate.create({
      data: {
        ...getCertificateSnapshot(template, new Date()),
        issueSource: ISSUE_SOURCES.GAME_NEMO_SUPERSTAR,
        issueReason: "Виграш у грі Nemo Superstar",
        issueComment: null,
        issueGroupId: null,
        sourceEventId: data.sourceEventId ?? null,
      },
    });

    return { certificate, idempotent: false };
  } catch (error) {
    if (
      data.sourceEventId &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await prisma.certificate.findUnique({
        where: {
          issueSource_sourceEventId: {
            issueSource: ISSUE_SOURCES.GAME_NEMO_SUPERSTAR,
            sourceEventId: data.sourceEventId,
          },
        },
      });

      if (existing) return { certificate: existing, idempotent: true };
    }

    throw error;
  }
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
  issueSource?: string;
  issueGroupId?: string;
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

  if (options.issueSource) {
    where.issueSource = options.issueSource;
  }

  if (options.issueGroupId) {
    where.issueGroupId = options.issueGroupId;
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
        issueSource: true,
        issueReason: true,
        issueComment: true,
        issueGroupId: true,
        sourceEventId: true,

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

export async function getCertificate(id: string) {
  const certificate = await prisma.certificate.findUnique({
    where: { id },
    include: {
      template: { select: { id: true, code: true } },
      redeemedByOperator: { select: { id: true, name: true } },
    },
  });

  if (!certificate) throw new CertificateNotFoundError();

  const status: CertificateEffectiveStatus =
    certificate.status === "ACTIVE" &&
    certificate.expiresAt <= new Date()
      ? "EXPIRED"
      : certificate.status;

  return { ...certificate, status };
}
