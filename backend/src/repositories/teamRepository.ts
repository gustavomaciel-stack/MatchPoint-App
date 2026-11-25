import { prisma } from '../config/prisma.js';

const teams = { host: true, opponent: true };

export const teamRepository = {
  mine: (ownerId: string) => prisma.team.findMany({ where: { ownerId }, orderBy: { name: 'asc' } }),
  find: (id: string) => prisma.team.findUnique({ where: { id } }),
  create: (data: { ownerId: string; name: string; sport: string; memberCount: number }) =>
    prisma.team.create({ data }),
  matches: () => prisma.teamMatch.findMany({ where: { startsAt: { gt: new Date() } }, include: teams, orderBy: { startsAt: 'asc' } }),
  match: (id: string) => prisma.teamMatch.findUnique({ where: { id }, include: teams }),
  publish: (data: { hostId: string; location: string; address: string; cep: string | null; latitude: number | null; longitude: number | null; startsAt: Date; playersPerSide: number; outdoor: boolean }) =>
    prisma.teamMatch.create({ data }),
  accept: (id: string, opponentId: string) => prisma.teamMatch.updateMany({
    where: { id, opponentId: null, cancelled: false, startsAt: { gt: new Date() } },
    data: { opponentId },
  }),
  cancel: (id: string, ownerId: string) => prisma.teamMatch.updateMany({
    where: { id, cancelled: false, host: { ownerId }, startsAt: { gt: new Date() } },
    data: { cancelled: true },
  }),
};
