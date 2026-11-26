import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import type { ActivityRows } from '../services/gamification.js';

const teamSideOf = (userId: string): Prisma.TeamWhereInput => ({
  OR: [{ ownerId: userId }, { memberships: { some: { userId, status: 'APROVADA' } } }],
});

const matchOf = (userId: string): Prisma.MatchWhereInput => ({
  OR: [{ organizerId: userId }, { participations: { some: { userId, status: 'CONFIRMADA' } } }],
});

const sideMembers = {
  select: {
    ownerId: true,
    sport: true,
    memberships: { where: { status: 'APROVADA' as const }, select: { userId: true } },
  },
};

export const activityRepository = {
  load: async (userId?: string): Promise<ActivityRows> => {
    const [matches, teamMatches, teams, memberships, ratings] = await Promise.all([
      prisma.match.findMany({
        where: { status: { not: 'CANCELADA' }, ...(userId ? matchOf(userId) : {}) },
        select: {
          sport: true,
          organizerId: true,
          participations: { where: { status: 'CONFIRMADA' }, select: { userId: true } },
        },
      }),
      prisma.teamMatch.findMany({
        where: {
          cancelled: false,
          opponentId: { not: null },
          ...(userId ? { OR: [{ host: teamSideOf(userId) }, { opponent: teamSideOf(userId) }] } : {}),
        },
        select: { host: sideMembers, opponent: sideMembers },
      }),
      prisma.team.groupBy({
        by: ['ownerId'],
        where: userId ? { ownerId: userId } : {},
        _count: { _all: true },
      }),
      prisma.teamMembership.findMany({
        where: { status: 'APROVADA', ...(userId ? { userId } : {}) },
        select: { userId: true },
      }),
      prisma.rating.groupBy({
        by: ['rateeId'],
        where: userId ? { rateeId: userId } : {},
        _count: { _all: true },
        _sum: { score: true },
      }),
    ]);

    const sideIds = (side: { ownerId: string; memberships: { userId: string }[] }) =>
      [side.ownerId, ...side.memberships.map((member) => member.userId)];

    return {
      matches: matches.map((match) => ({
        sport: match.sport,
        organizerId: match.organizerId,
        participantIds: match.participations.map((participation) => participation.userId),
      })),
      teamMatches: teamMatches.flatMap((match) => (match.opponent
        ? [{ sport: match.host.sport, sides: [sideIds(match.host), sideIds(match.opponent)] }]
        : [])),
      teamsOwned: teams.map((team) => ({ ownerId: team.ownerId, count: team._count._all })),
      memberships,
      ratings: ratings.map((rating) => ({
        rateeId: rating.rateeId,
        count: rating._count._all,
        sum: rating._sum.score ?? 0,
      })),
    };
  },

  pastMatches: (userId: string, upToDate: Date) => {
    return prisma.match.findMany({
      where: { status: { not: 'CANCELADA' }, date: { lte: upToDate }, ...matchOf(userId) },
      select: {
        id: true,
        sport: true,
        location: true,
        date: true,
        time: true,
        organizerId: true,
        organizer: { select: { id: true, name: true } },
      },
      orderBy: [{ date: 'desc' }, { time: 'desc' }],
      take: 100,
    });
  },

  pastTeamMatches: (userId: string, before: Date) => {
    const side = {
      select: {
        name: true,
        sport: true,
        ownerId: true,
        memberships: { where: { userId, status: 'APROVADA' as const }, select: { id: true } },
      },
    };
    return prisma.teamMatch.findMany({
      where: {
        cancelled: false,
        opponentId: { not: null },
        startsAt: { lt: before },
        OR: [{ host: teamSideOf(userId) }, { opponent: teamSideOf(userId) }],
      },
      select: { id: true, location: true, startsAt: true, host: side, opponent: side },
      orderBy: { startsAt: 'desc' },
      take: 100,
    });
  },

  users: () => prisma.user.findMany({ select: { id: true, name: true } }),
};
