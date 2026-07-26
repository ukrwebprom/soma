import { prisma } from "../lib/prisma.js";

interface CreateOrganizationData {
  name: string;
  slug: string;
}

export async function createOrganization(
  data: CreateOrganizationData,
) {
  return prisma.organization.create({
    data: {
      name: data.name,
      slug: data.slug,
    },
  });
}