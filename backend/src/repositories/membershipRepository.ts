import { prisma } from '../config/prisma.js';

export type MembershipDecision = 'APROVADA' | 'RECUSADA';

export const membershipRepository = {
  explore: () => {
    return prisma.team.findMany({
      select: {
        id: true,
        name: true,
        sport: true,
        memberCount: true,
        ownerId: true,
        owner: { select: { id: true, name: true } },
        memberships: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ sport: 'asc' }, { name: 'asc' }],
    });
  },

  find: (id: string) => {
    return prisma.teamMembership.findUnique({
      where: { id },
      include: { team: { select: { ownerId: true } } },
    });
  },

  findByTeamAndUser: (teamId: string, userId: string) => {
    return prisma.teamMembership.findUnique({ where: { teamId_userId: { teamId, userId } } });
  },

  create: (teamId: string, userId: string) => {
    return prisma.teamMembership.create({ data: { teamId, userId } });
  },

  reopen: (id: string) => {
    return prisma.teamMembership.updateMany({
      where: { id, status: 'RECUSADA' },
      data: { status: 'PENDENTE' },
    });
  },

  decide: (id: string, status: MembershipDecision) => {
    return prisma.teamMembership.updateMany({
      where: { id, status: 'PENDENTE' },
      data: { status },
    });
  },

  remove: (id: string) => {
    return prisma.teamMembership.deleteMany({ where: { id } });
  },
};
