import { prisma } from '../config/prisma.js';

export const matchRepository = {
  findById: (id: string) => {
    return prisma.match.findUnique({
      where: { id },
      include: {
        organizer: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  },

  findAll: (userId?: string) => {
    return prisma.match.findMany({
      where: userId ? {
        OR: [
          { organizerId: userId },
          { participations: { some: { userId, status: 'CONFIRMADA' } } },
        ],
      } : undefined,
      include: {
        organizer: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: {
            participations: { where: { status: 'CONFIRMADA' } },
          },
        },
      },
      orderBy: { date: 'asc' },
    });
  },

  create: (data: {
    sport: string;
    location: string;
    address?: string | null;
  pricePerPerson?: number;
  notes?: string | null;
    date: Date;
    time: string;
    vacancies: number;
    organizerId: string;
  }) => {
    return prisma.match.create({ data });
  },

  update: (id: string, data: {
    sport: string;
    location: string;
    address?: string | null;
  pricePerPerson?: number;
  notes?: string | null;
    date: Date;
    time: string;
    vacancies: number;
  }) => {
    return prisma.match.update({ where: { id }, data });
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

  updateStatus: (id: string, status: 'ABERTA' | 'COMPLETA') => {
    return prisma.match.update({
      where: { id },
      data: { status },
    });
  },

  countConfirmedParticipants: (matchId: string) => {
    return prisma.participation.count({
      where: { matchId, status: 'CONFIRMADA' },
    });
  },
};
