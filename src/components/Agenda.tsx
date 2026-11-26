import { useEffect, useState } from 'react';
import { listMyMatches, teamsApi } from '../services/api';
import { sportIcon } from '../data/sports';
import { matchStartMs, relativeDay } from '../data/format';
import { paths } from '../router';
import { Link } from './Link';

type Category = 'organized' | 'joined' | 'teams';
type Entry = {
  id: string;
  start: number;
  category: Category;
  title: string;
  icon: string;
  location: string;
  status: string;
  detail: string;
  cancelled: boolean;
};

const filters = [
  ['all', 'Todas'],
  ['organized', 'Organizadas por mim'],
  ['joined', 'Vou participar'],
  ['teams', 'Dos meus times'],
] as const;

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' });
const weekdayFormat = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'America/Sao_Paulo' });
const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

async function loadAgenda(userId: string): Promise<Entry[]> {
  const [matches, confrontations] = await Promise.all([listMyMatches(), teamsApi.matches()]);
  const individual = matches.map((match): Entry => {
    const organized = match.organizerId === userId;
    const confirmed = match.confirmedParticipants ?? 0;
    return {
      id: match.id,
      start: matchStartMs(match),
      category: organized ? 'organized' : 'joined',
      title: match.sport,
      icon: sportIcon(match.sport),
      location: match.location,
      status: match.status === 'CANCELADA' ? 'Cancelada' : organized ? 'Você organiza' : 'Presença confirmada',
      detail: `${confirmed}/${match.vacancies} confirmados`,
      cancelled: match.status === 'CANCELADA',
    };
  });
  const teams = confrontations
    .filter((match) => match.involved)
    .map((match): Entry => ({
      id: match.id,
      start: Date.parse(match.startsAt),
      category: 'teams',
      title: match.opponent ? `${match.host.name} × ${match.opponent.name}` : match.host.name,
      icon: sportIcon(match.host.sport),
      location: match.location,
      status: match.cancelled ? 'Cancelado' : match.opponent ? 'Confronto confirmado' : 'Buscando adversário',
      detail: `${match.host.sport} · ${match.playersPerSide} × ${match.playersPerSide}`,
      cancelled: match.cancelled,
    }));
  return [...individual, ...teams].sort((first, second) => first.start - second.start);
}

export function Agenda({ userId }: { userId: string }) {
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [entries, setEntries] = useState<Entry[]>();
  const [error, setError] = useState('');
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    loadAgenda(userId)
      .then((items) => { if (active) setEntries(items); })
      .catch((problem: unknown) => {
        if (active) setError(problem instanceof Error ? problem.message : 'Erro ao carregar a agenda.');
      });
    return () => { active = false; };
  }, [userId]);

  const visible = entries?.filter((entry) => entry.start > now
    && (category === 'all' || category === entry.category));

  return <section>
    <div className="section-heading">
      <div>
        <h2>Minhas partidas</h2>
        <p className="muted">Tudo o que você organiza, vai jogar ou disputa com seus times.</p>
      </div>
    </div>
    <div className="view-filters" aria-label="Filtrar agenda">
      {filters.map(([value, label]) => <button key={value} type="button" aria-pressed={category === value}
        onClick={() => setCategory(value)}>{label}</button>)}
    </div>
    {error && <p className="error" role="alert">{error}</p>}
    {!entries && !error && <p role="status">Carregando próximas partidas…</p>}
    {visible?.length === 0 && <div className="empty">
      <p className="sport-emblem center" aria-hidden="true">📅</p>
      <p><strong>{category === 'all' ? 'Sua agenda está livre.' : 'Nada por aqui neste filtro.'}</strong></p>
      <p className="muted">Encontre uma partida com vagas ou organize a sua.</p>
      <div className="actions center">
        <Link className="button" to={paths.explore()}>Explorar partidas</Link>
        <Link className="button secondary" to={paths.matchNew()}>Criar partida</Link>
      </div>
    </div>}
    <div className="agenda-list">
      {visible?.map((entry) => {
        const soon = relativeDay(entry.start, now);
        return <article className={`agenda-row ${entry.cancelled ? 'is-cancelled' : ''}`} key={`${entry.category}-${entry.id}`}>
          <time dateTime={new Date(entry.start).toISOString()}>
            <span className="agenda-weekday">{soon ?? weekdayFormat.format(entry.start).replace('.', '')}</span>
            <strong>{dateFormat.format(entry.start).replace('.', '')}</strong>
            <span>{timeFormat.format(entry.start)}</span>
          </time>
          <div>
            <h3><span aria-hidden="true">{entry.icon}</span> {entry.title}</h3>
            <p className="muted">📍 {entry.location} · {entry.detail}</p>
          </div>
          <span className="agenda-status">{entry.status}</span>
          <Link className="button secondary" to={entry.category === 'teams' ? paths.teamMatch(entry.id) : paths.match(entry.id)}>Ver detalhes</Link>
        </article>;
      })}
    </div>
  </section>;
}
