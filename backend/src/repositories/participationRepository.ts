import { prisma } from '../config/prisma.js';
import { lockMatch } from './matchRepository.js';

export const participationRepository = {
  join: (matchId: string, userId: string) => {
    return prisma.$transaction(async (tx) => {
      await lockMatch(tx, matchId);
      const match = await tx.match.findUnique({
        where: { id: matchId },
        select: { status: true, vacancies: true },
      });
      if (!match || (match.status !== 'ABERTA' && match.status !== 'COMPLETA')) {
        return { error: 'closed' as const };
      }

      const existing = await tx.participation.findUnique({
        where: { matchId_userId: { matchId, userId } },
      });
      if (existing?.status === 'CONFIRMADA') {
        return { error: 'already-joined' as const };
      }

      const confirmed = await tx.participation.count({
        where: { matchId, status: 'CONFIRMADA' },
      });
      if (confirmed >= match.vacancies) {
        return { error: 'full' as const };
      }

      const participation = existing
        ? await tx.participation.update({ where: { id: existing.id }, data: { status: 'CONFIRMADA' } })
        : await tx.participation.create({ data: { matchId, userId, status: 'CONFIRMADA' } });

      if (confirmed + 1 >= match.vacancies) {
        await tx.match.update({ where: { id: matchId }, data: { status: 'COMPLETA' } });
      }

      return { participation };
    });
  },

  leave: (matchId: string, userId: string) => {
    return prisma.$transaction(async (tx) => {
      await lockMatch(tx, matchId);
      const existing = await tx.participation.findUnique({
        where: { matchId_userId: { matchId, userId } },
      });
      if (!existing || existing.status !== 'CONFIRMADA') {
        return { error: 'not-joined' as const };
      }

      const participation = await tx.participation.update({
        where: { id: existing.id },
        data: { status: 'CANCELADA' },
      });
      await tx.match.updateMany({
        where: { id: matchId, status: 'COMPLETA' },
        data: { status: 'ABERTA' },
      });

      return { participation };
    });
  },

  findConfirmedByMatch: (matchId: string) => {
    return prisma.participation.findMany({
      where: { matchId, status: 'CONFIRMADA' },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  },
};
