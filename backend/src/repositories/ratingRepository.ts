import { prisma } from '../config/prisma.js';

export const ratingRepository = {
  listReceived: (rateeId: string) => {
    return prisma.rating.findMany({
      where: { rateeId },
      select: {
        id: true,
        score: true,
        comment: true,
        createdAt: true,
        updatedAt: true,
        rater: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
  },

  findByPair: (raterId: string, rateeId: string) => {
    return prisma.rating.findUnique({
      where: { raterId_rateeId: { raterId, rateeId } },
      select: { score: true, comment: true },
    });
  },

  upsert: (raterId: string, rateeId: string, data: { score: number; comment: string | null }) => {
    return prisma.rating.upsert({
      where: { raterId_rateeId: { raterId, rateeId } },
      create: { raterId, rateeId, ...data },
      update: data,
      select: { score: true, comment: true },
    });
  },

  remove: (raterId: string, rateeId: string) => {
    return prisma.rating.deleteMany({ where: { raterId, rateeId } });
  },
};
