const TZ = 'America/Sao_Paulo';

const longDate = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ });
const shortDate = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: TZ });
const clock = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ });

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function matchStartMs(match: { date: string; time: string }) {
  return Date.parse(`${match.date.slice(0, 10)}T${match.time}:00-03:00`);
}

export function formatLongDateTime(ms: number) {
  return capitalize(`${longDate.format(ms)} · ${clock.format(ms)}`);
}

export function formatShortDateTime(ms: number) {
  return capitalize(`${shortDate.format(ms).replace('.', '')} · ${clock.format(ms)}`);
}

export function formatPrice(cents?: number) {
  return cents
    ? (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'Grátis';
}

export function relativeDay(ms: number, now = Date.now()) {
  const day = (value: number) => new Date(value - 3 * 3600000).toISOString().slice(0, 10);
  const diff = Math.round((Date.parse(day(ms)) - Date.parse(day(now))) / 86400000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff > 1 && diff < 7) return `Em ${diff} dias`;
  return null;
}

export function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
