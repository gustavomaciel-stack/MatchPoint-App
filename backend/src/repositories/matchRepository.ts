import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';

export type MatchData = {
  sport: string;
  location: string;
  address?: string | null;
  cep?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  pricePerPerson?: number;
  notes?: string | null;
  date: Date;
  time: string;
  vacancies: number;
};

export const lockMatch = (tx: Prisma.TransactionClient, id: string) =>
  tx.$queryRaw`SELECT "id" FROM "Match" WHERE "id" = ${id} FOR UPDATE`;

export const matchRepository = {
  findById: (id: string) => {
    return prisma.match.findUnique({
      where: { id },
      include: {
        organizer: {
          select: { id: true, name: true },
        },
      },
    });
  },

  findAll: (fromDate: Date, viewerId: string, onlyInvolved: boolean) => {
    return prisma.match.findMany({
      where: {
        date: { gte: fromDate },
        ...(onlyInvolved ? {
          OR: [
            { organizerId: viewerId },
            { participations: { some: { userId: viewerId, status: 'CONFIRMADA' } } },
          ],
        } : {}),
      },
      include: {
        organizer: {
          select: { id: true, name: true },
        },
        participations: {
          where: { userId: viewerId, status: 'CONFIRMADA' },
          select: { id: true },
        },
        _count: {
          select: {
            participations: { where: { status: 'CONFIRMADA' } },
          },
        },
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    });
  },

  create: (data: MatchData & { organizerId: string }) => {
    return prisma.match.create({ data });
  },

  updateWithCapacity: (id: string, data: MatchData) => {
    return prisma.$transaction(async (tx) => {
      await lockMatch(tx, id);
      const current = await tx.match.findUnique({ where: { id }, select: { status: true } });
      if (!current || current.status === 'CANCELADA' || current.status === 'CONCLUIDA') {
        return { error: 'closed' as const };
      }

      const confirmed = await tx.participation.count({
        where: { matchId: id, status: 'CONFIRMADA' },
      });
      if (data.vacancies < confirmed) {
        return { error: 'below-confirmed' as const };
      }

      const match = await tx.match.update({
        where: { id },
        data: { ...data, status: confirmed >= data.vacancies ? 'COMPLETA' : 'ABERTA' },
      });
      return { match };
    });
  },

  cancel: (id: string) => {
    return prisma.match.update({
      where: { id },
      data: { status: 'CANCELADA' },
    });
  },

  remove: (id: string) => {
    return prisma.match.delete({ where: { id } });
  },
};
