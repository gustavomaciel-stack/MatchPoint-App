import { AppError } from "../errors/AppError.js";
import { matchRepository } from "../repositories/matchRepository.js";
import { participationRepository } from "../repositories/participationRepository.js";
import { userRepository } from "../repositories/userRepository.js";

import { isUpcomingMatch, startOfBrasiliaToday } from './matchSchedule.js';
import { parsePlace } from './place.js';

const MAX_VACANCIES = 1000;

export type MatchInput = {
  sport?: unknown;
  location?: unknown;
  address?: unknown;
  cep?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  pricePerPerson?: unknown;
  notes?: unknown;
  date?: unknown;
  time?: unknown;
  vacancies?: unknown;
  organizerId: string;
};

const trimmed = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const parseMatchInput = (data: MatchInput) => {
  const { date, time, organizerId } = data;
  const sport = trimmed(data.sport);
  const location = trimmed(data.location);

  if (!sport || !location || !date || !time || !organizerId) {
    throw new AppError(
      "Esporte, local, data, horário e organizador são obrigatórios.",
      400,
    );
  }
  if (sport.length > 80) {
    throw new AppError("O esporte deve ter até 80 caracteres.", 400);
  }
  if (location.length > 300) {
    throw new AppError("O nome do local deve ter até 300 caracteres.", 400);
  }
  if (data.address != null && (typeof data.address !== "string" || data.address.length > 300)) {
    throw new AppError("Informe um endereço com até 300 caracteres.", 400);
  }
  const pricePerPerson = data.pricePerPerson ?? 0;
  if (typeof pricePerPerson !== "number" || !Number.isSafeInteger(pricePerPerson)
    || pricePerPerson < 0 || pricePerPerson > 100000000) {
    throw new AppError("Informe um valor por pessoa válido.", 400);
  }
  if (data.notes != null && (typeof data.notes !== "string" || data.notes.length > 2000)) {
    throw new AppError("As observações devem ter até 2000 caracteres.", 400);
  }

  const parsedVacancies = Number(data.vacancies);
  if (!Number.isInteger(parsedVacancies) || parsedVacancies <= 0 || parsedVacancies > MAX_VACANCIES) {
    throw new AppError(`A quantidade de vagas deve estar entre 1 e ${MAX_VACANCIES}.`, 400);
  }

  const parsedDate = new Date(String(date));
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)
    || Number.isNaN(+parsedDate) || parsedDate.toISOString().slice(0, 10) !== date) {
    throw new AppError("A data da partida é inválida.", 400);
  }

  if (typeof time !== "string" || !isUpcomingMatch({ date: parsedDate, time })) {
    throw new AppError("Informe uma data e hora futura válida.", 400);
  }

  return {
    sport,
    location,
    address: typeof data.address === "string" ? data.address.trim() || null : null,
    ...parsePlace(data),
    pricePerPerson,
    notes: typeof data.notes === "string" ? data.notes.trim() || null : null,
    date: parsedDate,
    time,
    vacancies: parsedVacancies,
    organizerId,
  };
};

export const matchService = {
  create: async (data: MatchInput) => {
    const input = parseMatchInput(data);
    const organizer = await userRepository.findById(input.organizerId);

    if (!organizer) {
      throw new AppError("Organizador não encontrado.", 404);
    }

    return matchRepository.create(input);
  },

  list: async (viewerId: string, onlyInvolved = false) => {
    const matches = await matchRepository.findAll(startOfBrasiliaToday(), viewerId, onlyInvolved);
    const now = Date.now();
    return matches.filter((match) => isUpcomingMatch(match, now)).map((match) => ({
      id: match.id,
      sport: match.sport,
      location: match.location,
      address: match.address,
      cep: match.cep,
      latitude: match.latitude,
      longitude: match.longitude,
      pricePerPerson: match.pricePerPerson,
      notes: match.notes,
      organizerId: match.organizerId,
      date: match.date,
      time: match.time,
      vacancies: match.vacancies,
      status: match.status,
      organizer: match.organizer,
      confirmedParticipants: match._count.participations,
      joined: match.participations.length > 0,
      createdAt: match.createdAt,
      updatedAt: match.updatedAt,
    }));
  },

  getById: async (id: string) => {
    const match = await matchRepository.findById(id);
    if (!match || !isUpcomingMatch(match)) {
      throw new AppError("Partida indisponível.", 404);
    }

    const participants = await participationRepository.findConfirmedByMatch(id);

    return {
      ...match,
      participants: participants.map((participation) => participation.user),
    };
  },

  update: async (id: string, data: MatchInput) => {
    const match = await matchRepository.findById(id);
    if (!match) {
      throw new AppError("Partida não encontrada.", 404);
    }
    if (match.organizerId !== data.organizerId) {
      throw new AppError("Acesso negado.", 403);
    }
    if (match.status === "CANCELADA" || match.status === "CONCLUIDA") {
      throw new AppError("Esta partida não pode mais ser editada.", 400);
    }

    const { organizerId: _organizerId, ...input } = parseMatchInput(data);
    const result = await matchRepository.updateWithCapacity(id, input);

    if ("error" in result) {
      throw new AppError(
        result.error === "closed"
          ? "Esta partida não pode mais ser editada."
          : "As vagas não podem ser menores que os participantes confirmados.",
        400,
      );
    }

    return result.match;
  },

  cancel: async (id: string, organizerId: string) => {
    const match = await matchRepository.findById(id);
    if (!match) {
      throw new AppError("Partida não encontrada.", 404);
    }
    if (match.organizerId !== organizerId) {
      throw new AppError("Acesso negado.", 403);
    }
    if (match.status === "CANCELADA") {
      throw new AppError("A partida já está cancelada.", 400);
    }

    return matchRepository.cancel(id);
  },

  remove: async (id: string, actorRole: 'USER' | 'ADMIN') => {
    const match = await matchRepository.findById(id);
    if (!match) {
      throw new AppError("Partida não encontrada.", 404);
    }

    if (actorRole !== "ADMIN") {
      throw new AppError("Acesso negado.", 403);
    }

    await matchRepository.remove(id);
    return { deleted: true };
  },
};
