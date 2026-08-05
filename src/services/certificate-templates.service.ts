import { prisma } from "../lib/prisma.js";

export interface CreateCertificateTemplateData {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  terms?: string | null;
  instructionText?: string | null;
  validityDays: number;

  coverPortraitUrl: string;
  coverLandscapeUrl: string;
  logoUrl?: string | null;
}

export async function createCertificateTemplate(
  data: CreateCertificateTemplateData,
) {
  return prisma.certificateTemplate.create({
    data: {
      id: data.id,
      code: data.code,
      title: data.title,
      description: data.description ?? null,
      terms: data.terms ?? null,
      instructionText: data.instructionText ?? null,
      validityDays: data.validityDays,

      coverPortraitUrl: data.coverPortraitUrl,
      coverLandscapeUrl: data.coverLandscapeUrl,
      logoUrl: data.logoUrl ?? null,
    },
  });
}

export async function getCertificateTemplates() {
  return prisma.certificateTemplate.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
}

export interface UpdateCertificateTemplateData {
  code: string;
  title: string;
  description?: string | null;
  terms?: string | null;
  instructionText?: string | null;
  validityDays: number;
  coverPortraitUrl?: string;
  coverLandscapeUrl?: string;
  logoUrl?: string;
}

export async function updateCertificateTemplate(
  id: string,
  data: UpdateCertificateTemplateData,
) {
  return prisma.certificateTemplate.update({
    where: { id },
    data: {
      code: data.code,
      title: data.title,
      description: data.description ?? null,
      terms: data.terms ?? null,
      instructionText: data.instructionText ?? null,
      validityDays: data.validityDays,
      ...(data.coverPortraitUrl
        ? { coverPortraitUrl: data.coverPortraitUrl }
        : {}),
      ...(data.coverLandscapeUrl
        ? { coverLandscapeUrl: data.coverLandscapeUrl }
        : {}),
      ...(data.logoUrl ? { logoUrl: data.logoUrl } : {}),
    },
  });
}
