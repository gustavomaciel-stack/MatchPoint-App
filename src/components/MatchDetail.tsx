import { useEffect, useState } from 'react';
import { sportIcon } from '../data/sports';
import { formatLongDateTime, formatPrice, matchStartMs, plural, relativeDay } from '../data/format';
import { cancelMatch, deleteMatch, getMatch, joinMatch, leaveMatch, type Match } from '../services/api';
import { useCurrentUser } from '../context/CurrentUserContext';
import { useToast } from '../context/ToastContext';
import { mapsUrl } from '../services/geo';
import { paths, shareUrl } from '../router';
import { LocationMap } from './LocationMap';
import { Link } from './Link';
import { ShareInvite } from './ShareInvite';

type Props = {
  id: string;
  onBack: () => void;
  onEdit: (id: string) => void;
  onOpenProfile: (userId: string) => void;
};

const labels = {
  ABERTA: 'Aberta',
  COMPLETA: 'Completa',
  CANCELADA: 'Cancelada',
  CONCLUIDA: 'Concluída',
};

export function MatchDetail({ id, onBack, onEdit, onOpenProfile }: Props) {
  const { currentUserId, isAdmin } = useCurrentUser();
  const toast = useToast();
  const [match, setMatch] = useState<Match | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setMatch(await getMatch(id));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar detalhes.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    getMatch(id)
      .then((data) => { if (active) { setMatch(data); setError(''); } })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : 'Erro ao carregar detalhes.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  async function action(callback: () => Promise<unknown>, success: string, confirmMessage?: string) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setBusy(true);
    try {
      await callback();
      toast(success);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro na operação.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <section><p role="status">Carregando partida…</p></section>;

  if (!match) {
    return <section className="empty match-missing">
      <p className="sport-emblem" aria-hidden="true">🏁</p>
      <h2>Partida indisponível</h2>
      <p>Esta partida já começou, foi removida ou o link está incorreto. Que tal procurar outra?</p>
      {error && error !== 'Partida indisponível.' && <p className="error">{error}</p>}
      <div className="actions center">
        <Link className="button" to={paths.explore()}>Ver partidas disponíveis</Link>
        <button type="button" className="button secondary" onClick={onBack}>Voltar</button>
      </div>
    </section>;
  }

  const participants = match.participants ?? [];
  const isOrganizer = currentUserId === match.organizerId;
  const isParticipant = participants.some((participant) => participant.id === currentUserId);
  const start = matchStartMs(match);
  const remaining = Math.max(match.vacancies - participants.length, 0);
  const fill = Math.min(participants.length / match.vacancies, 1);
  const isActive = match.status !== 'CANCELADA' && match.status !== 'CONCLUIDA';
  const soon = relativeDay(start);

  return <section className="match-detail">
    <button type="button" className="back-link" onClick={onBack}>← Voltar</button>

    <article className="match-hero">
      <div className="match-hero-main">
        <div className="sport-emblem" aria-hidden="true">{sportIcon(match.sport)}</div>
        <div>
          <span className={`status status-${match.status.toLowerCase()}`}>{labels[match.status]}</span>
          <h2>{match.sport}</h2>
          <p className="match-when">{soon && <strong className="soon-pill">{soon}</strong>} {formatLongDateTime(start)}</p>
          <p className="muted">📍 {match.location}{match.address ? ` · ${match.address}` : ''}</p>
          <p className="muted">
            Organizada por{' '}
            <button type="button" className="link-button" onClick={() => onOpenProfile(match.organizerId)}>
              {isOrganizer ? 'você' : match.organizer.name}
            </button>
          </p>
        </div>
      </div>

      <div className="match-hero-side">
        <div className="vacancy-meter" aria-label={`${participants.length} de ${match.vacancies} vagas preenchidas`}>
          <div className="vacancy-numbers">
            <strong>{participants.length}/{match.vacancies}</strong>
            <span>{remaining > 0 ? plural(remaining, 'vaga livre', 'vagas livres') : 'Lotada'}</span>
          </div>
          <div className="meter"><span style={{ width: `${fill * 100}%` }} /></div>
        </div>
        <p className="price-tag">{formatPrice(match.pricePerPerson)}{match.pricePerPerson ? ' por pessoa' : ''}</p>

        {isActive && isOrganizer && <p className="you-pill">⭐ Você organiza esta partida</p>}
        {isActive && isParticipant && <p className="you-pill">✅ Sua presença está confirmada</p>}

        <div className="actions">
          {isActive && !isOrganizer && !isParticipant && match.status === 'ABERTA' && (
            <button type="button" className="button button-lg" disabled={busy || !currentUserId}
              onClick={() => void action(() => joinMatch(id), 'Presença confirmada! +20 XP 🎉')}>
              Confirmar presença
            </button>
          )}
          {isActive && !isOrganizer && !isParticipant && match.status === 'COMPLETA' && (
            <p className="muted">Esta partida está lotada. Se alguém sair, a vaga reabre.</p>
          )}
          {isActive && !isOrganizer && isParticipant && (
            <button type="button" className="button secondary" disabled={busy}
              onClick={() => void action(() => leaveMatch(id), 'Você saiu da partida.', 'Quer mesmo sair desta partida? Sua vaga ficará livre para outra pessoa.')}>
              Sair da partida
            </button>
          )}
          {isActive && isOrganizer && <>
            <button type="button" className="button secondary" disabled={busy} onClick={() => onEdit(match.id)}>Editar</button>
            <button type="button" className="button danger" disabled={busy}
              onClick={() => void action(() => cancelMatch(id), 'Partida cancelada.', 'Cancelar esta partida? Os participantes verão que ela foi cancelada.')}>
              Cancelar partida
            </button>
          </>}
          {isAdmin && (
            <button type="button" className="button danger" disabled={busy}
              onClick={async () => {
                if (!window.confirm('Excluir esta partida permanentemente?')) return;
                try {
                  await deleteMatch(id);
                  toast('Partida excluída.');
                  onBack();
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Erro ao excluir partida.');
                }
              }}>
              Excluir (admin)
            </button>
          )}
        </div>
        {error && <p className="error" role="alert">{error}</p>}
      </div>
    </article>

    {isActive && <ShareInvite
      url={shareUrl(paths.match(match.id))}
      title={`${match.sport} · MatchPoint`}
      text={`Bora jogar ${match.sport}? ${sportIcon(match.sport)}\n${formatLongDateTime(start)}\n📍 ${match.location}\n${remaining > 0 ? `${plural(remaining, 'vaga livre', 'vagas livres')} · ` : ''}${formatPrice(match.pricePerPerson)}\nConfirme presença:`}
      highlight={isOrganizer && participants.length === 0}
    />}

    <div className="detail-grid">
      <article className="detail-panel">
        <h3>Local</h3>
        {match.address && <p>{match.address}</p>}
        {match.latitude != null && match.longitude != null && <LocationMap position={{ latitude: match.latitude, longitude: match.longitude }} label={`Mapa de ${match.location}`} />}
        <a className="button secondary" href={mapsUrl(match)} target="_blank" rel="noopener noreferrer">Abrir no Google Maps</a>
      </article>

      <aside className="detail-side">
        {match.notes && <article className="detail-panel">
          <h3>Observações</h3>
          <p className="notes">{match.notes}</p>
        </article>}
        {Boolean(match.pricePerPerson) && <article className="detail-panel">
          <h3>Pagamento</h3>
          <p>{formatPrice(match.pricePerPerson)} por pessoa, combinado diretamente com o organizador.</p>
        </article>}
        <article className="detail-panel">
          <h3>Quem vai ({participants.length})</h3>
          {participants.length === 0
            ? <p className="muted">Ninguém confirmou ainda. {isOrganizer ? 'Compartilhe o convite com a turma!' : 'Seja o primeiro!'}</p>
            : <ul className="people-chips">
              {participants.map((participant) => <li key={participant.id}>
                <button type="button" className="person-chip" onClick={() => onOpenProfile(participant.id)}>
                  <span className="chip-avatar" aria-hidden="true">{participant.name.trim().charAt(0).toUpperCase()}</span>
                  {participant.id === currentUserId ? 'Você' : participant.name}
                </button>
              </li>)}
            </ul>}
        </article>
      </aside>
    </div>
  </section>;
}
