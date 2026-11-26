const API_URL =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:3001" : "");

const REQUEST_TIMEOUT_MS = 60000;

export const TOKEN_STORAGE_KEY = "matchpoint_token";

export type UserRole = 'USER' | 'ADMIN';

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
};

export type MatchStatus = "ABERTA" | "COMPLETA" | "CONCLUIDA" | "CANCELADA";

export type Match = {
  id: string;
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
  status: MatchStatus;
  organizerId: string;
  organizer: PersonRef;
  confirmedParticipants?: number;
  joined?: boolean;
  participants?: Participant[];
  createdAt: string;
  updatedAt: string;
};

export type Participant = {
  id: string;
  name: string;
  createdAt?: string;
};

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

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  if (!API_URL) {
    throw new Error("A URL da API não foi configurada (VITE_API_URL).");
  }

  const token = localStorage.getItem(TOKEN_STORAGE_KEY);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: options?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });
  } catch (error) {
    throw new Error(
      error instanceof DOMException && error.name === "TimeoutError"
        ? "O servidor demorou demais para responder. Tente novamente."
        : "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
    );
  }

  const body = (await response.json().catch(() => null)) as
    | { message?: string }
    | null;

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      const authChannel = globalThis as unknown as EventTarget;
      authChannel.dispatchEvent(new Event("matchpoint:logout"));
    }

    throw new Error(
      body?.message ?? "Não foi possível concluir a solicitação.",
    );
  }

  return body as T;
}

export function login(email: string, password: string) {
  return request<{ token: string; user?: User }>('/auth/login', {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function logout() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function getTokenUserId(token: string) {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    );

    return typeof decoded.userId === "string" ? decoded.userId : "";
  } catch {
    return "";
  }
}

export function registerUser(data: {
  name: string;
  email: string;
  password: string;
}) {
  return request<User>("/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getAuthenticatedUser() {
  return request<User>("/auth/me");
}

export function listUsers() {
  return request<User[]>("/users");
}

export function listMyMatches() {
  return request<Match[]>('/matches/mine');
}

export function listMatches() {
  return request<Match[]>("/matches");
}

export function getMatch(id: string) {
  return request<Match>(`/matches/${id}`);
}

export function createMatch(data: MatchInput) {
  return request<Match>("/matches", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateMatch(
  id: string,
  data: Partial<Omit<MatchInput, "organizerId">> & { organizerId: string },
) {
  return request<Match>(`/matches/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function cancelMatch(id: string) {
  return request<Match>(`/matches/${id}/cancel`, {
    method: "PATCH",
  });
}

export function deleteMatch(id: string) {
  return request<{ deleted: true }>(`/matches/${id}`, {
    method: "DELETE",
  });
}

export function deleteUser(id: string) {
  return request<{ deleted: true }>(`/users/${id}`, {
    method: "DELETE",
  });
}

export function joinMatch(id: string) {
  return request(`/matches/${id}/join`, {
    method: "POST",
  });
}

export function leaveMatch(id: string) {
  return request(`/matches/${id}/leave`, {
    method: "POST",
  });
}

export function getParticipants(id: string) {
  return request<Participant[]>(`/matches/${id}/participants`);
}
export type Team = {
  id: string;
  name: string;
  sport: string;
  memberCount: number;
  ownerId: string;
};

export type TeamMatch = {
  id: string;
  host: Team;
  opponent: Team | null;
  location: string;
  address: string | null;
  cep: string | null;
  latitude: number | null;
  longitude: number | null;
  startsAt: string;
  playersPerSide: number;
  outdoor: boolean;
  cancelled: boolean;
  involved: boolean;
};

export type MembershipStatus = 'PENDENTE' | 'APROVADA' | 'RECUSADA';

export type PersonRef = { id: string; name: string };

export type TeamOverview = {
  id: string;
  name: string;
  sport: string;
  memberCount: number;
  owner: PersonRef;
  members: (PersonRef & { membershipId: string })[];
  myStatus: MembershipStatus | 'DONO' | null;
  myMembershipId: string | null;
  canManage: boolean;
  requests: { id: string; createdAt: string; user: PersonRef }[];
};

export const teamsApi = {
  mine: () => request<Team[]>('/teams'),
  explore: () => request<TeamOverview[]>('/teams/explore'),
  requestJoin: (teamId: string) =>
    request<{ id: string; status: MembershipStatus }>(`/teams/${teamId}/requests`, { method: 'POST' }),
  decide: (membershipId: string, status: 'APROVADA' | 'RECUSADA') =>
    request(`/team-requests/${membershipId}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  removeMembership: (membershipId: string) =>
    request(`/team-requests/${membershipId}`, { method: 'DELETE' }),
  matches: () => request<TeamMatch[]>('/team-matches'),
  create: (input: Pick<Team, 'name' | 'sport' | 'memberCount'>) =>
    request<Team>('/teams', { method: 'POST', body: JSON.stringify(input) }),
  publish: (input: { teamId: string; location: string; address: string; cep: string | null; latitude: number; longitude: number; startsAt: string; playersPerSide: number; outdoor: boolean }) =>
    request<TeamMatch>('/team-matches', { method: 'POST', body: JSON.stringify(input) }),
  accept: (id: string, teamId: string) =>
    request(`/team-matches/${id}/accept`, { method: 'POST', body: JSON.stringify({ teamId }) }),
  cancel: (id: string) => request(`/team-matches/${id}/cancel`, { method: 'PATCH' }),
};

export type Badge = {
  id: string;
  name: string;
  icon: string;
  description: string;
  earned: boolean;
  progress: { current: number; target: number };
};

export type Gamification = {
  xp: number;
  level: {
    number: number;
    name: string;
    minXp: number;
    nextXp: number | null;
    nextName: string | null;
    progress: number;
  };
  badges: Badge[];
  stats: {
    organized: number;
    participations: number;
    teamGames: number;
    sports: number;
    teamsOwned: number;
    teamsJoined: number;
    ratingCount: number;
    ratingAverage: number | null;
  };
};

export type HistoryEntry = {
  kind: 'match' | 'team';
  id: string;
  title: string;
  location: string;
  startsAt: string;
  role: string;
  detail: string | null;
};

export type RatingItem = {
  id: string;
  score: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  rater: PersonRef;
};

export type Profile = {
  user: { id: string; name: string; role: UserRole; createdAt: string; email: string | null };
  isSelf: boolean;
  gamification: Gamification;
  history: HistoryEntry[];
  ratings: {
    average: number | null;
    count: number;
    items: RatingItem[];
    mine: { score: number; comment: string | null } | null;
    canRate: boolean;
  };
};

export type RankingEntry = {
  position: number;
  id: string;
  name: string;
  xp: number;
  level: number;
  levelName: string;
  badges: Pick<Badge, 'id' | 'name' | 'icon'>[];
};

export const profileApi = {
  get: (userId: string) => request<Profile>(`/users/${userId}/profile`),
  rate: (userId: string, score: number, comment: string) =>
    request<{ score: number; comment: string | null }>(`/users/${userId}/rating`, {
      method: 'PUT',
      body: JSON.stringify({ score, comment }),
    }),
  unrate: (userId: string) => request(`/users/${userId}/rating`, { method: 'DELETE' }),
  ranking: () => request<{ top: RankingEntry[]; me: RankingEntry | null }>('/ranking'),
};
