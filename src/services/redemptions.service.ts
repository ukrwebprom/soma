import { prisma } from "../lib/prisma.js";

export interface GetRedemptionsOptions {
  page: number;
  limit: number;
  from?: Date;
  to?: Date;
}

export async function getRedemptions(
  options: GetRedemptionsOptions,
) {
  const where = {
    status: "REDEEMED" as const,
    redeemedAt: {
      not: null,
      ...(options.from
        ? { gte: options.from }
        : {}),
      ...(options.to
        ? { lte: options.to }
        : {}),
    },
  };

  const [redemptions, total] =
    await Promise.all([
      prisma.certificate.findMany({
        where,
        orderBy: {
          redeemedAt: "desc",
        },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
        select: {
          id: true,
          code: true,
          title: true,
          redeemedAt: true,
          issueSource: true,
          issueReason: true,
          issueComment: true,
          issueGroupId: true,
          sourceEventId: true,
          redeemedByOperator: {
            select: {
              id: true,
              name: true,
            },
          },
          template: {
            select: {
              id: true,
              code: true,
            },
          },
        },
      }),
      prisma.certificate.count({ where }),
    ]);

  return {
    redemptions: redemptions.map(
      ({
        id,
        redeemedByOperator,
        ...redemption
      }) => ({
        certificateId: id,
        ...redemption,
        operator: redeemedByOperator,
      }),
    ),
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit),
    },
  };
}
