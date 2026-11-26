import { useEffect, useState } from 'react';
import { isFutureBrasiliaTime } from '../data/matchSchedule';
import { sportIcon } from '../data/sports';
import { formatPrice, formatShortDateTime, matchStartMs, plural, relativeDay } from '../data/format';
import { deleteMatch, listMatches, type Match } from '../services/api';
import { useCurrentUser } from '../context/CurrentUserContext';
import { useToast } from '../context/ToastContext';
import { paths } from '../router';
import { Link } from './Link';

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function MatchList() {
  const { isAdmin, currentUserId } = useCurrentUser();
  const toast = useToast();
  const [sportFilter, setSportFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    listMatches()
      .then((allMatches) => { if (active) setMatches(allMatches); })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : 'Erro ao carregar partidas.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function handleDelete(matchId: string) {
    if (!window.confirm('Excluir esta partida e todas as confirmações relacionadas?')) return;
    try {
      await deleteMatch(matchId);
      setMatches((previous) => previous.filter((match) => match.id !== matchId));
      toast('Partida excluída.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir partida.');
    }
  }

  const hasFilters = Boolean(sportFilter.trim() || dateFilter || locationFilter.trim());
  const visibleMatches = matches.filter((match) => isFutureBrasiliaTime(`${match.date.slice(0, 10)}T${match.time}`)
    && match.status === 'ABERTA' && (match.confirmedParticipants ?? 0) < match.vacancies
    && normalize(match.sport).includes(normalize(sportFilter.trim()))
    && (!dateFilter || match.date.slice(0, 10) === dateFilter)
    && normalize(`${match.location} ${match.address ?? ''}`).includes(normalize(locationFilter.trim())));

  return <section>
    <div className="section-heading">
      <div>
        <h3>Partidas com vagas</h3>
        <p className="muted">Escolha uma partida e confirme presença, ou crie a sua e convide a turma.</p>
      </div>
      <Link className="button" to={paths.matchNew()}>+ Criar partida</Link>
    </div>

    <div className="match-filters">
      <label>Esporte<input placeholder="Ex.: futebol" value={sportFilter} onChange={(event) => setSportFilter(event.target.value)} /></label>
      <label>Data<input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} /></label>
      <label>Local ou endereço<input placeholder="Quadra, bairro ou cidade" value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} /></label>
      {hasFilters && <button type="button" className="button secondary" onClick={() => { setSportFilter(''); setDateFilter(''); setLocationFilter(''); }}>Limpar filtros</button>}
    </div>

    {loading && <p role="status">Carregando partidas…</p>}
    {error && <p className="error" role="alert">{error}</p>}
    {!loading && !error && <p className="muted" aria-live="polite">{plural(visibleMatches.length, 'partida encontrada', 'partidas encontradas')}</p>}

    {!loading && !error && visibleMatches.length === 0 && <div className="empty">
      <p className="sport-emblem center" aria-hidden="true">🏟️</p>
      {hasFilters
        ? <><p>Nenhuma partida com esses filtros.</p><p className="muted">Tente outra data ou esporte, ou crie uma partida do jeito que você quer.</p></>
        : <><p><strong>Nenhuma partida com vagas no momento.</strong></p><p className="muted">Que tal ser o primeiro? Crie uma partida e mande o convite para a turma.</p></>}
      <Link className="button" to={paths.matchNew()}>Criar partida</Link>
    </div>}

    {!loading && !error && visibleMatches.length > 0 && <div className="match-grid">
      {visibleMatches.map((match) => {
        const confirmed = match.confirmedParticipants ?? 0;
        const remaining = match.vacancies - confirmed;
        const start = matchStartMs(match);
        const soon = relativeDay(start);
        const mine = match.organizerId === currentUserId;
        return <article className="match-card" key={match.id}>
          <div className="match-card-top">
            <div className="sport-emblem" aria-hidden="true">{sportIcon(match.sport)}</div>
            {mine
              ? <span className="you-badge">⭐ Você organiza</span>
              : match.joined ? <span className="you-badge">✅ Você vai</span>
                : soon && <span className="soon-pill">{soon}</span>}
          </div>
          <h3><Link className="card-link" to={paths.match(match.id)}>{match.sport}</Link></h3>
          <p className="match-card-when">{formatShortDateTime(start)}</p>
          <p className="muted">📍 {match.location}</p>
          <div className="vacancy-meter small">
            <div className="vacancy-numbers">
              <span>{plural(remaining, 'vaga livre', 'vagas livres')}</span>
              <span className="muted">{confirmed}/{match.vacancies}</span>
            </div>
            <div className="meter"><span style={{ width: `${Math.min(confirmed / match.vacancies, 1) * 100}%` }} /></div>
          </div>
          <div className="match-card-actions">
            <strong className="price">{formatPrice(match.pricePerPerson)}</strong>
            <Link className="button secondary" to={paths.match(match.id)}>Ver partida</Link>
            {isAdmin && <button className="button danger small" onClick={() => void handleDelete(match.id)} type="button">Excluir</button>}
          </div>
        </article>;
      })}
    </div>}
  </section>;
}
