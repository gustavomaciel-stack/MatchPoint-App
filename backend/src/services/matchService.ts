import { AppError } from "../errors/AppError.js";
import { matchRepository } from "../repositories/matchRepository.js";
import { participationRepository } from "../repositories/participationRepository.js";
import { userRepository } from "../repositories/userRepository.js";

import { isUpcomingMatch } from './matchSchedule.js';
import { parsePlace } from './place.js';

export type MatchInput = {
  sport: string;
  location: string;
  address?: string | null;
  cep?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  pricePerPerson?: number;
  notes?: string | null;
  date: string;
  time: string;
  vacancies: number;
  organizerId: string;
};

const parseMatchInput = (data: MatchInput) => {
  const { sport, location, date, time, vacancies, organizerId } = data;
  if (data.address != null && (typeof data.address !== "string" || data.address.length > 300)) {
    throw new AppError("Informe um endereço com até 300 caracteres.", 400);
  }
  const pricePerPerson = data.pricePerPerson ?? 0;
  if (!Number.isSafeInteger(pricePerPerson) || pricePerPerson < 0 || pricePerPerson > 100000000) {
    throw new AppError("Informe um valor por pessoa válido.", 400);
  }
  if (data.notes != null && (typeof data.notes !== "string" || data.notes.length > 2000)) {
    throw new AppError("As observações devem ter até 2000 caracteres.", 400);
  }
  const parsedVacancies = Number(vacancies);
  const parsedDate = new Date(date);

  if (!sport || !location || !date || !time || !organizerId) {
    throw new AppError(
      "Esporte, local, data, horário e organizador são obrigatórios.",
      400,
    );
  }

  if (!Number.isInteger(parsedVacancies) || parsedVacancies <= 0) {
    throw new AppError("A quantidade de vagas deve ser maior que zero.", 400);
  }

  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)
    || Number.isNaN(+parsedDate) || parsedDate.toISOString().slice(0, 10) !== date) {
    throw new AppError("A data da partida é inválida.", 400);
  }

  if (!isUpcomingMatch({ date: parsedDate, time })) {
    throw new AppError("Informe uma data e hora futura válida.", 400);
  }

  return {
    sport,
    location,
    address: data.address?.trim() || null,
    ...parsePlace(data),
    pricePerPerson,
    notes: data.notes?.trim() || null,
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

  list: async (userId?: string) => {
    const matches = await matchRepository.findAll(userId);
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

    const input = parseMatchInput(data);
    const confirmed = await matchRepository.countConfirmedParticipants(id);
    if (input.vacancies < confirmed) {
      throw new AppError(
        "As vagas não podem ser menores que os participantes confirmados.",
        400,
      );
    }

    return matchRepository.update(id, {
      sport: input.sport,
      location: input.location,
      address: input.address,
      cep: input.cep,
      latitude: input.latitude,
      longitude: input.longitude,
      pricePerPerson: input.pricePerPerson,
      notes: input.notes,
      date: input.date,
      time: input.time,
      vacancies: input.vacancies,
    });
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
