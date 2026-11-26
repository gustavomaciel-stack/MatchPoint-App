import { AppError } from '../errors/AppError.js';
import { activityRepository } from '../repositories/activityRepository.js';
import { ratingRepository } from '../repositories/ratingRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { accumulate, gamificationFor } from './gamification.js';
import { isPastMatch, matchStart, startOfBrasiliaToday } from './matchSchedule.js';

type Actor = { userId: string; role: 'USER' | 'ADMIN' };

type Side = { name: string; sport: string; ownerId: string; memberships: { id: string }[] };

const MAX_COMMENT = 500;
const RANKING_SIZE = 20;

const sideOf = (userId: string, host: Side, opponent: Side) =>
  host.ownerId === userId || host.memberships.length > 0 ? host : opponent;

export const profileService = {
  async get(viewer: Actor, userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('Usuário não encontrado.', 404);

    const now = Date.now();
    const isSelf = viewer.userId === userId;
    const [rows, matches, teamMatches, ratings, mine] = await Promise.all([
      activityRepository.load(userId),
      activityRepository.pastMatches(userId, startOfBrasiliaToday(now)),
      activityRepository.pastTeamMatches(userId, new Date(now)),
      ratingRepository.listReceived(userId),
      isSelf ? null : ratingRepository.findByPair(viewer.userId, userId),
    ]);

    const gamification = gamificationFor(accumulate(rows).get(userId));

    const history = [
      ...matches.filter((match) => isPastMatch(match, now)).map((match) => ({
        kind: 'match' as const,
        id: match.id,
        title: match.sport,
        location: match.location,
        startsAt: matchStart(match)!.toISOString(),
        role: match.organizerId === userId ? 'Organizou' : 'Participou',
        detail: match.organizerId === userId ? null : `Organizada por ${match.organizer.name}`,
      })),
      ...teamMatches.flatMap((match) => {
        if (!match.opponent) return [];
        const side = sideOf(userId, match.host, match.opponent);
        return [{
          kind: 'team' as const,
          id: match.id,
          title: `${match.host.name} × ${match.opponent.name}`,
          location: match.location,
          startsAt: match.startsAt.toISOString(),
          role: side.ownerId === userId ? `Responsável por ${side.name}` : `Jogou por ${side.name}`,
          detail: match.host.sport,
        }];
      }),
    ].sort((first, second) => second.startsAt.localeCompare(first.startsAt)).slice(0, 50);

    return {
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        email: isSelf || viewer.role === 'ADMIN' ? user.email : null,
      },
      isSelf,
      gamification,
      history,
      ratings: {
        average: gamification.stats.ratingAverage,
        count: gamification.stats.ratingCount,
        items: ratings,
        mine,
        canRate: !isSelf,
      },
    };
  },

  async rate(raterId: string, rateeId: string, body: { score?: unknown; comment?: unknown } = {}) {
    if (raterId === rateeId) throw new AppError('Você não pode avaliar a si mesmo.', 400);

    const { score, comment } = body;
    if (typeof score !== 'number' || !Number.isInteger(score) || score < 1 || score > 5) {
      throw new AppError('A nota deve ser um número inteiro de 1 a 5.', 400);
    }
    if (comment != null && (typeof comment !== 'string' || comment.trim().length > MAX_COMMENT)) {
      throw new AppError(`O comentário deve ter até ${MAX_COMMENT} caracteres.`, 400);
    }

    const ratee = await userRepository.findById(rateeId);
    if (!ratee) throw new AppError('Usuário não encontrado.', 404);

    return ratingRepository.upsert(raterId, rateeId, {
      score,
      comment: typeof comment === 'string' ? comment.trim() || null : null,
    });
  },

  async unrate(raterId: string, rateeId: string) {
    const result = await ratingRepository.remove(raterId, rateeId);
    if (!result.count) throw new AppError('Você ainda não avaliou este jogador.', 404);
    return { deleted: true };
  },

  async ranking(viewerId: string) {
    const [rows, users] = await Promise.all([activityRepository.load(), activityRepository.users()]);
    const activity = accumulate(rows);

    const ranked = users
      .map((user) => {
        const { xp, level, badges } = gamificationFor(activity.get(user.id));
        return {
          id: user.id,
          name: user.name,
          xp,
          level: level.number,
          levelName: level.name,
          badges: badges.filter((badge) => badge.earned).map(({ id, name, icon }) => ({ id, name, icon })),
        };
      })
      .sort((first, second) => second.xp - first.xp || first.name.localeCompare(second.name, 'pt-BR'))
      .map((entry, index) => ({ position: index + 1, ...entry }));

    return {
      top: ranked.filter((entry) => entry.xp > 0).slice(0, RANKING_SIZE),
      me: ranked.find((entry) => entry.id === viewerId) ?? null,
    };
  },
};
