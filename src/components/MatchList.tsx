import { isFutureBrasiliaTime } from '../data/matchSchedule';
import { sportIcon } from '../data/sports';
import { useEffect, useState } from 'react';
import {
  deleteMatch,
  listMatches,
  type Match,
} from '../services/api';
import { useCurrentUser } from '../context/CurrentUserContext';

type Props = {
  onCreate: () => void;
  onSelect: (id: string) => void;
};

const statusLabels = {
  ABERTA: 'Aberta',
  COMPLETA: 'Completa',
  CANCELADA: 'Cancelada',
  CONCLUIDA: 'Concluída',
};

export function MatchList({ onCreate, onSelect }: Props) {
  const { isAdmin } = useCurrentUser();
  const [sportFilter, setSportFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function handleDelete(matchId: string) {
    const confirmed = window.confirm(
      'Deseja excluir esta partida e todas as confirmações relacionadas?',
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteMatch(matchId);
      setMatches((previous) => previous.filter((match) => match.id !== matchId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir partida.');
    }
  }


  useEffect(() => {
    let active = true;

    async function loadMatches() {
      setLoading(true);
      setError('');

      try {
        const allMatches = await listMatches();
        if (active) setMatches(allMatches);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Erro ao carregar partidas.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadMatches();

    return () => {
      active = false;
    };
  }, []);

  const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const visibleMatches = matches.filter((match) => {
    return isFutureBrasiliaTime(`${match.date.slice(0, 10)}T${match.time}`)

      && match.status === 'ABERTA' && (match.confirmedParticipants ?? 0) < match.vacancies
      && normalize(match.sport).includes(normalize(sportFilter.trim()))
      && (!dateFilter || match.date.slice(0, 10) === dateFilter)
      && normalize(`${match.location} ${match.address ?? ''}`).includes(normalize(locationFilter.trim()));
  });

  return (
    <section>
      <div className="section-heading">
        <h3>Partidas disponíveis</h3>
        <button className="button" onClick={onCreate}>Criar partida</button>
      </div>

      <div className="match-filters">
        <label>Esporte<input placeholder="Ex.: futebol" value={sportFilter} onChange={(event) => setSportFilter(event.target.value)} /></label>
        <label>Data<input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} /></label>
        <label>Local ou endereço<input placeholder="Quadra, bairro ou cidade" value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} /></label>
        <button type="button" className="button secondary" onClick={() => { setSportFilter(''); setDateFilter(''); setLocationFilter(''); }}>Limpar filtros</button>
      </div>
      {!loading && !error && <p className="muted" aria-live="polite">{visibleMatches.length} partida(s) encontrada(s)</p>}
      {loading && <p>Carregando partidas...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && visibleMatches.length === 0 && (
        <div className="empty">
          <p>Nenhuma partida encontrada com os filtros selecionados.</p>
        </div>
      )}

      {!loading && !error && (
        <div className="match-grid">
          {visibleMatches.map((match) => (
            <article className="match-card" key={match.id}>
              <div
                className={`status status-${match.status.toLowerCase()}`}
              >
                {statusLabels[match.status]}
              </div>

              <div className="sport-emblem" aria-hidden="true">{sportIcon(match.sport)}</div><h3>{match.sport}</h3>
              <p>{match.location}</p>
              <p><strong>{match.pricePerPerson ? `${(match.pricePerPerson / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} por pessoa` : 'Grátis'}</strong></p>
              <p>
                <strong>
                  {new Date(match.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                </strong>{' '}
                às {match.time}
              </p>
              <p>{match.vacancies - (match.confirmedParticipants ?? 0)} vaga(s) livre(s)</p>

              <div className="match-card-actions">
                <button
                  className="button secondary"
                  onClick={() => onSelect(match.id)}
                  type="button"
                >
                  Ver detalhes
                </button>

                {isAdmin && (
                  <button
                    className="button danger small"
                    onClick={() => void handleDelete(match.id)}
                    type="button"
                  >
                    Excluir
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}