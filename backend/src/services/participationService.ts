import { AppError } from '../errors/AppError.js';
import { matchRepository } from '../repositories/matchRepository.js';
import { participationRepository } from '../repositories/participationRepository.js';

import { isUpcomingMatch } from './matchSchedule.js';

const JOIN_ERRORS = {
  closed: ['A partida não está aberta para participação.', 400],
  'already-joined': ['Usuário já participa desta partida.', 409],
  full: ['Não há vagas disponíveis nesta partida.', 409],
} as const;

export const participationService = {
  join: async (matchId: string, userId: string) => {
    const match = await matchRepository.findById(matchId);
    if (!match) throw new AppError('Partida não encontrada.', 404);
    if (!isUpcomingMatch(match)) {
      throw new AppError('A partida não está aberta para participação.', 400);
    }
    if (match.organizerId === userId) {
      throw new AppError('Você organiza esta partida e já faz parte dela.', 400);
    }

    const result = await participationRepository.join(matchId, userId);
    if (result.error) {
      const [message, status] = JOIN_ERRORS[result.error];
      throw new AppError(message, status);
    }

    return result.participation;
  },

  leave: async (matchId: string, userId: string) => {
    const match = await matchRepository.findById(matchId);
    if (!match) throw new AppError('Partida não encontrada.', 404);
    if (!isUpcomingMatch(match)) {
      throw new AppError('A partida já aconteceu e faz parte do histórico.', 400);
    }

    const result = await participationRepository.leave(matchId, userId);
    if ('error' in result) {
      throw new AppError('Participação confirmada não encontrada.', 404);
    }

    return result.participation;
  },

  listByMatch: async (matchId: string) => {
    const match = await matchRepository.findById(matchId);
    if (!match || !isUpcomingMatch(match)) throw new AppError('Partida indisponível.', 404);

    const participants = await participationRepository.findConfirmedByMatch(matchId);
    return participants.map((participation) => ({
      id: participation.user.id,
      name: participation.user.name,
      createdAt: participation.createdAt,
    }));
  },
};
