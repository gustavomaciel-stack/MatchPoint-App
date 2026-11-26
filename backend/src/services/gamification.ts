export type ActivityRows = {
  matches: { sport: string; organizerId: string; participantIds: string[] }[];
  teamMatches: { sport: string; sides: string[][] }[];
  teamsOwned: { ownerId: string; count: number }[];
  memberships: { userId: string }[];
  ratings: { rateeId: string; count: number; sum: number }[];
};

export type Activity = {
  organized: number;
  participations: number;
  teamGames: number;
  sports: Set<string>;
  teamsOwned: number;
  teamsJoined: number;
  ratingCount: number;
  ratingSum: number;
};

export const XP_RULES = {
  organized: 30,
  participation: 20,
  teamGame: 25,
  team: 10,
  maxTeamsScored: 3,
  perRatingStar: 2,
} as const;

export const LEVELS = [
  { minXp: 0, name: 'Novato' },
  { minXp: 100, name: 'Amador' },
  { minXp: 250, name: 'Titular' },
  { minXp: 500, name: 'Destaque' },
  { minXp: 900, name: 'Craque' },
  { minXp: 1500, name: 'Lenda' },
] as const;

const emptyActivity = (): Activity => ({
  organized: 0,
  participations: 0,
  teamGames: 0,
  sports: new Set(),
  teamsOwned: 0,
  teamsJoined: 0,
  ratingCount: 0,
  ratingSum: 0,
});

export function accumulate(rows: ActivityRows): Map<string, Activity> {
  const byUser = new Map<string, Activity>();
  const get = (userId: string) => {
    let activity = byUser.get(userId);
    if (!activity) {
      activity = emptyActivity();
      byUser.set(userId, activity);
    }
    return activity;
  };
  const sportKey = (sport: string) => sport.trim().toLocaleLowerCase('pt-BR');

  for (const match of rows.matches) {
    const participants = new Set(match.participantIds.filter((id) => id !== match.organizerId));
    if (participants.size > 0) {
      const organizer = get(match.organizerId);
      organizer.organized += 1;
      organizer.sports.add(sportKey(match.sport));
    }
    for (const userId of participants) {
      const activity = get(userId);
      activity.participations += 1;
      activity.sports.add(sportKey(match.sport));
    }
  }

  for (const match of rows.teamMatches) {
    for (const userId of new Set(match.sides.flat())) {
      const activity = get(userId);
      activity.teamGames += 1;
      activity.sports.add(sportKey(match.sport));
    }
  }

  for (const { ownerId, count } of rows.teamsOwned) get(ownerId).teamsOwned += count;
  for (const { userId } of rows.memberships) get(userId).teamsJoined += 1;
  for (const { rateeId, count, sum } of rows.ratings) {
    const activity = get(rateeId);
    activity.ratingCount += count;
    activity.ratingSum += sum;
  }

  return byUser;
}

export function experience(activity: Activity) {
  return activity.organized * XP_RULES.organized
    + activity.participations * XP_RULES.participation
    + activity.teamGames * XP_RULES.teamGame
    + Math.min(activity.teamsOwned, XP_RULES.maxTeamsScored) * XP_RULES.team
    + Math.min(activity.teamsJoined, XP_RULES.maxTeamsScored) * XP_RULES.team
    + activity.ratingSum * XP_RULES.perRatingStar;
}

export function levelFor(xp: number) {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i += 1) {
    if (xp >= LEVELS[i].minXp) index = i;
  }
  const current = LEVELS[index];
  const next = LEVELS[index + 1];
  return {
    number: index + 1,
    name: current.name,
    minXp: current.minXp,
    nextXp: next?.minXp ?? null,
    nextName: next?.name ?? null,
    progress: next ? (xp - current.minXp) / (next.minXp - current.minXp) : 1,
  };
}

export function badgesFor(activity: Activity) {
  const games = activity.participations + activity.teamGames;
  const average = activity.ratingCount ? activity.ratingSum / activity.ratingCount : 0;
  const badge = (id: string, name: string, icon: string, description: string, current: number, target: number, extra = true) => ({
    id,
    name,
    icon,
    description,
    earned: current >= target && extra,
    progress: { current: Math.min(current, target), target },
  });

  return [
    badge('estreia', 'Estreia', '🎉', 'Confirme presença na primeira partida ou confronto.', games, 1),
    badge('capitao', 'Capitão', '🧢', 'Crie um time.', activity.teamsOwned, 1),
    badge('equipe', 'Espírito de equipe', '🤝', 'Seja aceito no time de outro jogador.', activity.teamsJoined, 1),
    badge('organizador', 'Organizador nato', '📋', 'Organize 5 partidas com pelo menos um participante.', activity.organized, 5),
    badge('multiesportista', 'Multiesportista', '🏅', 'Jogue 3 esportes diferentes.', activity.sports.size, 3),
    badge('veterano', 'Veterano', '🏆', 'Some 20 participações, partidas organizadas e confrontos.', games + activity.organized, 20),
    badge('fair-play', 'Fair play', '⭐', 'Receba 3 avaliações com média 4,5 ou mais.', activity.ratingCount, 3, average >= 4.5),
  ];
}

export function gamificationFor(activity: Activity = emptyActivity()) {
  const xp = experience(activity);
  return {
    xp,
    level: levelFor(xp),
    badges: badgesFor(activity),
    stats: {
      organized: activity.organized,
      participations: activity.participations,
      teamGames: activity.teamGames,
      sports: activity.sports.size,
      teamsOwned: activity.teamsOwned,
      teamsJoined: activity.teamsJoined,
      ratingCount: activity.ratingCount,
      ratingAverage: activity.ratingCount ? Math.round((activity.ratingSum / activity.ratingCount) * 10) / 10 : null,
    },
  };
}
