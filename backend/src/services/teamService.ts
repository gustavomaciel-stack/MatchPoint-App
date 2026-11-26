import { parseBrasiliaStart } from './matchSchedule.js';
import { Prisma } from '@prisma/client';
import { AppError } from '../errors/AppError.js';
import { membershipRepository } from '../repositories/membershipRepository.js';
import { teamRepository } from '../repositories/teamRepository.js';
import { parsePlace } from './place.js';

function requiredText(value: unknown, label: string, max: number) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    throw new AppError(`${label}: preencha com até ${max} caracteres.`, 400);
  }
  return value.trim();
}

function playerCount(value: unknown) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 100) {
    throw new AppError('Informe uma quantidade inteira entre 1 e 100.', 400);
  }
  return value;
}

async function ownedTeam(value: unknown, ownerId: string) {
  const team = await teamRepository.find(requiredText(value, 'Time', 100));
  if (!team || team.ownerId !== ownerId) throw new AppError('Selecione um dos seus times.', 403);
  return team;
}

type Actor = { userId: string; role: 'USER' | 'ADMIN' };

type TeamWithViewer = {
  ownerId: string;
  memberships: { id: string }[];
};

const isOnSide = (team: TeamWithViewer | null, userId: string) =>
  Boolean(team && (team.ownerId === userId || team.memberships.length > 0));

const withoutMemberships = <T extends { memberships: unknown }>({ memberships: _memberships, ...team }: T) => team;

export const teamService = {
  list: (ownerId: string) => teamRepository.mine(ownerId),
  async matches(userId: string) {
    const matches = await teamRepository.matches(userId);
    return matches.map(({ host, opponent, ...match }) => ({
      ...match,
      host: withoutMemberships(host),
      opponent: opponent ? withoutMemberships(opponent) : null,
      involved: isOnSide(host, userId) || isOnSide(opponent, userId),
    }));
  },
  async explore(actor: Actor) {
    const teams = await membershipRepository.explore();
    return teams.map(({ memberships, ...team }) => {
      const isOwner = team.ownerId === actor.userId;
      const canManage = isOwner || actor.role === 'ADMIN';
      const mine = memberships.find((membership) => membership.user.id === actor.userId);
      return {
        id: team.id,
        name: team.name,
        sport: team.sport,
        memberCount: team.memberCount,
        owner: team.owner,
        members: memberships
          .filter((membership) => membership.status === 'APROVADA')
          .map((membership) => ({ membershipId: membership.id, ...membership.user })),
        myStatus: isOwner ? 'DONO' : mine?.status ?? null,
        myMembershipId: mine?.id ?? null,
        canManage,
        requests: canManage
          ? memberships
            .filter((membership) => membership.status === 'PENDENTE')
            .map((membership) => ({ id: membership.id, createdAt: membership.createdAt, user: membership.user }))
          : [],
      };
    });
  },
  async requestJoin(userId: string, teamId: string) {
    const team = await teamRepository.find(teamId);
    if (!team) throw new AppError('Time não encontrado.', 404);
    if (team.ownerId === userId) throw new AppError('Você já é o responsável por este time.', 400);

    const existing = await membershipRepository.findByTeamAndUser(teamId, userId);
    if (existing?.status === 'PENDENTE') throw new AppError('Sua solicitação já está aguardando aprovação.', 409);
    if (existing?.status === 'APROVADA') throw new AppError('Você já faz parte deste time.', 409);
    if (existing) {
      const reopened = await membershipRepository.reopen(existing.id);
      if (!reopened.count) throw new AppError('Sua solicitação já foi atualizada. Recarregue a página.', 409);
      return { id: existing.id, status: 'PENDENTE' as const };
    }

    try {
      const created = await membershipRepository.create(teamId, userId);
      return { id: created.id, status: created.status };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError('Sua solicitação já foi enviada.', 409);
      }
      throw error;
    }
  },
  async decideRequest(actor: Actor, id: string, decision: unknown) {
    if (decision !== 'APROVADA' && decision !== 'RECUSADA') {
      throw new AppError('Informe se a solicitação foi aprovada ou recusada.', 400);
    }
    const membership = await membershipRepository.find(id);
    if (!membership) throw new AppError('Solicitação não encontrada.', 404);
    if (membership.team.ownerId !== actor.userId && actor.role !== 'ADMIN') {
      throw new AppError('Apenas o responsável pelo time pode responder a esta solicitação.', 403);
    }
    const result = await membershipRepository.decide(id, decision);
    if (!result.count) throw new AppError('Esta solicitação já foi respondida.', 409);
    return { id, status: decision };
  },
  async removeMembership(actor: Actor, id: string) {
    const membership = await membershipRepository.find(id);
    if (!membership) throw new AppError('Solicitação não encontrada.', 404);
    const allowed = membership.userId === actor.userId
      || membership.team.ownerId === actor.userId
      || actor.role === 'ADMIN';
    if (!allowed) throw new AppError('Acesso negado.', 403);
    await membershipRepository.remove(id);
    return { deleted: true };
  },
  async create(ownerId: string, body: Record<string, unknown>) {
    try {
      return await teamRepository.create({
        ownerId,
        name: requiredText(body.name, 'Nome', 80),
        sport: requiredText(body.sport, 'Esporte', 80),
        memberCount: playerCount(body.memberCount),
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError('Você já tem um time com esse nome e esporte.', 409);
      }
      throw error;
    }
  },
  async publish(ownerId: string, body: Record<string, unknown>) {
    const host = await ownedTeam(body.teamId, ownerId);
    const playersPerSide = playerCount(body.playersPerSide);
    const localTime = requiredText(body.startsAt, 'Data e hora', 16);
    const startsAt = parseBrasiliaStart(localTime);
    if (!startsAt || +startsAt <= Date.now()) {
      throw new AppError('Informe uma data e hora futura válida.', 400);
    }
    if (host.memberCount < playersPerSide) throw new AppError('Seu time tem integrantes insuficientes.', 400);
    return teamRepository.publish({
      hostId: host.id, playersPerSide, startsAt,
      location: requiredText(body.location, 'Local', 300),
      address: requiredText(body.address, 'Endereço', 300), outdoor: body.outdoor === true,
      ...parsePlace(body),
    });
  },
  async accept(ownerId: string, id: string, teamId: unknown) {
    const team = await ownedTeam(teamId, ownerId);
    const match = await teamRepository.match(id);
    if (!match) throw new AppError('Confronto não encontrado.', 404);
    if (match.host.ownerId === ownerId || match.host.sport !== team.sport || team.memberCount < match.playersPerSide) {
      throw new AppError('Escolha um time elegível de outro responsável, do mesmo esporte e com integrantes suficientes.', 400);
    }
    const result = await teamRepository.accept(id, team.id);
    if (!result.count) throw new AppError('O confronto não está mais disponível.', 409);
    return result;
  },
  async cancel(ownerId: string, id: string) {
    const result = await teamRepository.cancel(id, ownerId);
    if (!result.count) throw new AppError('Este confronto não pode ser cancelado por você.', 409);
    return result;
  },
};
