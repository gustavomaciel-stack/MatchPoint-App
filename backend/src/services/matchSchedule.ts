export function parseBrasiliaStart(local: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const start = new Date(`${local}:00-03:00`);
  if (!Number.isFinite(+start) || new Date(+start - 10800000).toISOString().slice(0, 16) !== local) {
    return null;
  }
  return start;
}

export function isUpcomingMatch(match: { date: Date; time: string }, now = Date.now()): boolean {
  const start = parseBrasiliaStart(`${match.date.toISOString().slice(0, 10)}T${match.time}`);
  return start !== null && +start > now;
}
