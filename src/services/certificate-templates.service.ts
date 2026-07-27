import { prisma } from "../lib/prisma.js";

export interface CreateCertificateTemplateData {
  code: string;
  title: string;
  description?: string | null;
  terms?: string | null;
  validityDays: number;
}

export async function createCertificateTemplate(
  data: CreateCertificateTemplateData,
) {
  return prisma.certificateTemplate.create({
    data: {
      code: data.code,
      title: data.title,
      description: data.description ?? null,
      terms: data.terms ?? null,
      validityDays: data.validityDays,
    },
  });
}