import { parseBrasiliaStart } from './matchSchedule.js';
import { Prisma } from '@prisma/client';
import { AppError } from '../errors/AppError.js';
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

export const teamService = {
  list: (ownerId: string) => teamRepository.mine(ownerId),
  matches: () => teamRepository.matches(),
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
