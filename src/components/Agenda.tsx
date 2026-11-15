import { useEffect, useState } from 'react';
import { listMyMatches, teamsApi } from '../services/api';

type Category = 'organized' | 'joined' | 'teams';
type Entry = { id: string; start: number; category: Category; title: string; location: string; status: string };

const filters = [
  ['all', 'Todas'],
  ['organized', 'Organizadas por mim'],
  ['joined', 'Inscrições confirmadas'],
  ['teams', 'Dos meus times'],
] as const;

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' });
const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

async function loadAgenda(userId: string): Promise<Entry[]> {
  const [matches, confrontations] = await Promise.all([listMyMatches(), teamsApi.matches()]);
  const individual = matches.map((match): Entry => {
    const organized = match.organizerId === userId;
    return {
      id: match.id,
      start: Date.parse(`${match.date.slice(0, 10)}T${match.time}:00-03:00`),
      category: organized ? 'organized' : 'joined',
      title: match.sport,
      location: match.location,
      status: match.status === 'CANCELADA' ? 'Cancelada' : organized ? 'Você organiza' : 'Inscrição confirmada',
    };
  });
  const teams = confrontations
    .filter((match) => match.host.ownerId === userId || match.opponent?.ownerId === userId)
    .map((match): Entry => ({
      id: match.id, start: Date.parse(match.startsAt), category: 'teams',
      title: match.opponent ? `${match.host.name} × ${match.opponent.name}` : match.host.name,
      location: match.location,
      status: match.cancelled ? 'Cancelado' : match.opponent ? 'Seu time joga' : 'Buscando adversário',
    }));
  return [...individual, ...teams]
    .sort((first, second) => first.start - second.start);
}

export function Agenda({ userId, onSelect }: {
  userId: string; onSelect: (id: string, teamMatch: boolean) => void;
}) {
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [entries, setEntries] = useState<Entry[]>();
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void loadAgenda(userId).then((items) => {
      if (active) setEntries(items);
    }).catch((problem: unknown) => {
      if (active) setError(problem instanceof Error ? problem.message : 'Erro ao carregar a agenda.');
    });
    return () => { active = false; };
  }, [userId]);

  const visible = entries?.filter((entry) => entry.start > Date.now()
    && (category === 'all' || category === entry.category));

  return <section>
    <div className="section-heading"><h2>Minhas partidas</h2></div>
    <div className="view-filters" aria-label="Filtrar agenda">
      {filters.map(([value, label]) => <button key={value} type="button" aria-pressed={category === value}
        onClick={() => setCategory(value)}>{label}</button>)}
    </div>
    {error && <p className="error" role="alert">{error}</p>}
    {!entries && !error && <p role="status">Carregando próximas partidas…</p>}
    {visible?.length === 0 && <p className="empty-state">Nenhuma próxima partida neste filtro.</p>}
    <div className="agenda-list">
      {visible?.map((entry) => <article className="agenda-row" key={`${entry.category}-${entry.id}`}>
        <time dateTime={new Date(entry.start).toISOString()}>
          <strong>{dateFormat.format(entry.start)}</strong>
          <span>{timeFormat.format(entry.start)}</span>
        </time>
        <div><h3>{entry.title}</h3><p className="muted">{entry.location}</p></div>
        <span className="agenda-status">{entry.status}</span>
        <button type="button" className="button secondary" onClick={() => onSelect(entry.id, entry.category === 'teams')}>Ver detalhes</button>
      </article>)}
    </div>
  </section>;
}
