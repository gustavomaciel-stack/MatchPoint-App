export function currentBrasiliaMinute() {
  return new Date(Date.now() - 10800000).toISOString().slice(0, 16);
}

export function isFutureBrasiliaTime(local: string, now = Date.now()) {
  return Date.parse(`${local}:00-03:00`) > now;
}
