import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { SPORTS, sportIcon } from '../data/sports';
import { teamsApi } from '../services/api';
import type { Team, TeamMatch } from '../services/api';
import { currentBrasiliaMinute, isFutureBrasiliaTime } from '../data/matchSchedule';
import { formatLongDateTime, relativeDay } from '../data/format';
import { getForecast } from '../services/weather';
import { mapsUrl, type Coordinates } from '../services/geo';
import { useToast } from '../context/ToastContext';
import { paths, shareUrl } from '../router';
import { LocationPicker, hasPin, type PlaceValue } from './LocationPicker';
import { LocationMap } from './LocationMap';
import { Link } from './Link';
import { ShareInvite } from './ShareInvite';

const EMPTY_PLACE: PlaceValue = { address: '', cep: '', latitude: null, longitude: null };

function Forecast({ startsAt, position }: { startsAt: string; position: Coordinates | null }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const forecast = await getForecast(startsAt, position);
      setMessage(forecast
        ? `${forecast.temperature.toLocaleString('pt-BR')} °C · ${forecast.rain}% de chance de chuva`
        : 'Sem previsão para esse horário. A consulta cobre hoje e os próximos seis dias.');
    } catch {
      setMessage('Previsão indisponível. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return <>
    <button type="button" className="button secondary" disabled={loading} onClick={() => void load()}>
      {loading ? 'Consultando…' : '🌦️ Previsão do tempo'}
    </button>
    {message && <p className="forecast" role="status">{message} · <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a></p>}
  </>;
}

type Props = {
  userId: string;
  mode: 'browse' | 'manage' | 'detail';
  matchId?: string;
  onChanged?: () => void;
};

export function TeamMatches({ userId, mode, matchId, onChanged }: Props) {
  const toast = useToast();
  const [data, setData] = useState<{ teams: Team[]; matches: TeamMatch[] }>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<'team' | 'match'>();
  const [place, setPlace] = useState<PlaceValue>(EMPTY_PLACE);
  const [now, setNow] = useState(() => Date.now());

  async function refresh() {
    const [teams, matches] = await Promise.all([teamsApi.mine(), teamsApi.matches()]);
    setData({ teams, matches });
    setNow(Date.now());
  }

  useEffect(() => {
    let active = true;
    Promise.all([teamsApi.mine(), teamsApi.matches()])
      .then(([teams, matches]) => { if (active) setData({ teams, matches }); })
      .catch((problem: unknown) => { if (active) setError(problem instanceof Error ? problem.message : 'Erro ao carregar os times.'); });
    return () => { active = false; };
  }, []);

  async function run(action: () => Promise<unknown>, success: string, afterSave?: () => void) {
    setBusy(true);
    setError('');
    try {
      await action();
      afterSave?.();
      toast(success);
      await refresh();
      onChanged?.();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Não foi possível concluir a solicitação.');
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const value = (key: string) => String(fields.get(key) ?? '');
    if (form === 'match' && !isFutureBrasiliaTime(value('startsAt'))) {
      setError('Escolha uma data e um horário que ainda não passaram.');
      return;
    }
    if (form === 'match' && !hasPin(place)) {
      setError('Marque o local do confronto no mapa para continuar.');
      return;
    }
    void run(() => form === 'team'
      ? teamsApi.create({ name: value('name'), sport: value('sport'), memberCount: Number(value('memberCount')) })
      : teamsApi.publish({
        teamId: value('teamId'), location: value('location'), address: place.address, cep: place.cep || null,
        latitude: place.latitude!, longitude: place.longitude!, startsAt: value('startsAt'),
        playersPerSide: Number(value('playersPerSide')), outdoor: fields.has('outdoor'),
      }), form === 'team' ? 'Time criado! Outros jogadores já podem encontrá-lo e pedir para entrar.' : 'Confronto publicado! Agora é esperar um adversário aceitar.',
    () => { setForm(undefined); setPlace(EMPTY_PLACE); });
  }

  const teams = data?.teams ?? [];
  const matches = data?.matches.filter((match) => (mode === 'detail'
    ? match.id === matchId
    : Date.parse(match.startsAt) > now && !match.cancelled && !match.opponent)) ?? [];

  return <section className="team-section">
    {mode === 'manage' && <div className="section-heading">
      <div>
        <h2>Meus times</h2>
        <p className="muted">Cadastre seus times, aprove quem pede para entrar e encontre outros times para jogar.</p>
      </div>
      <button type="button" className="button" disabled={busy} onClick={() => setForm('team')}>+ Cadastrar time</button>
    </div>}
    {mode === 'browse' && <div className="section-heading">
      <div>
        <h3>Confrontos buscando adversário</h3>
        <p className="muted">Desafie outro time ou publique um confronto para o seu.</p>
      </div>
      <button type="button" className="button" disabled={busy || !teams.length} onClick={() => setForm('match')}>+ Publicar confronto</button>
    </div>}
    {mode === 'browse' && data && !teams.length && <p className="hint-box">Para publicar ou aceitar confrontos você precisa de um time. <Link className="link-button" to={paths.teams()}>Cadastre o seu em Meus times</Link>.</p>}
    {error && <p className="error" role="alert">{error}</p>}
    {form && <form className="team-card team-form" onSubmit={submit}>
      <h3>{form === 'team' ? 'Novo time' : 'Novo confronto'}</h3>
      {form === 'team' ? <>
        <label>Nome do time<input name="name" maxLength={80} required placeholder="Ex.: Fut de Quinta" /></label>
        <label>Esporte<select name="sport" required>{SPORTS.map(({ name }) => <option key={name}>{name}</option>)}</select></label>
        <label>Número de integrantes
          <input name="memberCount" type="number" min="1" max="100" required />
          <small className="field-hint">Quantas pessoas jogam no time, contando quem não tem conta no MatchPoint.</small>
        </label>
      </> : <>
        <label>Time<select name="teamId" required>{teams.map((team) => <option value={team.id} key={team.id}>{team.name} · {team.sport}</option>)}</select></label>
        <div className="form-row two">
          <label>Data e hora<input name="startsAt" type="datetime-local" min={currentBrasiliaMinute()} required /></label>
          <label>Jogadores por lado<input name="playersPerSide" type="number" min="1" max="100" required /></label>
        </div>
        <label>Nome do local<input name="location" maxLength={300} placeholder="Ex.: Ginásio do bairro" required /></label>
        <LocationPicker value={place} onChange={setPlace} addressRequired />
        <label className="team-check"><input name="outdoor" type="checkbox" /> Jogo ao ar livre (mostra a previsão do tempo)</label>
      </>}
      <div className="team-actions">
        <button className="button" disabled={busy}>{form === 'team' ? 'Criar time' : 'Publicar confronto'}</button>
        <button className="button secondary" type="button" disabled={busy} onClick={() => setForm(undefined)}>Cancelar</button>
      </div>
    </form>}
    {!data && !error && mode !== 'manage' && <p role="status">Carregando confrontos…</p>}
    {data && mode !== 'manage' && <>
      {!matches.length && (mode === 'detail'
        ? <div className="empty"><p><strong>Confronto indisponível.</strong></p><p className="muted">Ele pode ter sido removido ou o link está incorreto.</p><Link className="button" to={paths.explore('teams')}>Ver confrontos</Link></div>
        : <div className="empty"><p className="sport-emblem center" aria-hidden="true">🤝</p><p>Nenhum confronto buscando adversário agora.</p>{teams.length > 0 && <p className="muted">Publique um confronto e desafie outros times!</p>}</div>)}
      <div className={mode === 'detail' ? '' : 'team-match-grid'}>
        {matches.map((match) => {
          const start = Date.parse(match.startsAt);
          const expired = start <= now;
          const own = match.host.ownerId === userId;
          const available = !match.cancelled && !expired && !match.opponent;
          const eligible = teams.filter((team) => team.sport === match.host.sport && team.memberCount >= match.playersPerSide);
          const position = match.latitude != null && match.longitude != null ? { latitude: match.latitude, longitude: match.longitude } : null;
          const status = match.cancelled ? 'Cancelado' : expired ? 'Já aconteceu' : match.opponent ? 'Confronto confirmado' : 'Buscando adversário';
          const soon = relativeDay(start, now);

          return <article key={match.id} className="team-card team-match-card">
            <div className="match-card-top">
              <div className="sport-emblem" aria-hidden="true">{sportIcon(match.host.sport)}</div>
              <span className={`status ${match.cancelled ? 'status-cancelada' : match.opponent ? 'status-completa' : 'status-aberta'}`}>{status}</span>
            </div>
            <h3>{match.host.name}{match.opponent ? ` × ${match.opponent.name}` : ' × ?'}</h3>
            <p className="match-card-when">{soon && <strong className="soon-pill">{soon}</strong>} {formatLongDateTime(start)}</p>
            <p className="muted">{match.host.sport} · {match.playersPerSide} × {match.playersPerSide}{match.outdoor ? ' · ao ar livre' : ''}</p>
            <p className="muted">📍 {match.location}{match.address ? ` · ${match.address}` : ''}</p>
            {position && mode === 'detail' && <LocationMap position={position} label={`Mapa de ${match.location}`} />}
            {available && !own && (eligible.length
              ? <form className="accept-form" onSubmit={(event) => {
                event.preventDefault();
                const teamId = String(new FormData(event.currentTarget).get('opponent'));
                void run(() => teamsApi.accept(match.id, teamId), 'Confronto aceito! Bom jogo! 🎉');
              }}>
                <label>Jogar com <select name="opponent">{eligible.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
                <button className="button" disabled={busy}>Aceitar confronto</button>
              </form>
              : <p className="hint-box">Para aceitar, você precisa de um time de {match.host.sport} com pelo menos {match.playersPerSide} integrantes.</p>)}
            <div className="team-card-actions">
              {mode !== 'detail' && <Link className="button secondary" to={paths.teamMatch(match.id)}>Ver detalhes</Link>}
              <a className="button secondary" href={mapsUrl(match.address || position ? match : { ...match, location: `${match.location}, Novo Hamburgo` })} target="_blank" rel="noopener noreferrer">Google Maps</a>
              {match.outdoor && !match.cancelled && !expired && <Forecast startsAt={match.startsAt} position={position} />}
              {own && !expired && !match.cancelled && <button type="button" className="button danger" disabled={busy} onClick={() => {
                if (window.confirm('Cancelar este confronto? O outro time verá que ele foi cancelado.')) void run(() => teamsApi.cancel(match.id), 'Confronto cancelado.');
              }}>Cancelar confronto</button>}
            </div>
            {mode === 'detail' && available && <ShareInvite
              url={shareUrl(paths.teamMatch(match.id))}
              title={`${match.host.name} procura adversário · MatchPoint`}
              text={`${match.host.name} procura adversário no ${match.host.sport}! ${sportIcon(match.host.sport)}\n${formatLongDateTime(start)}\n📍 ${match.location} · ${match.playersPerSide} × ${match.playersPerSide}\nAceite o desafio:`}
            />}
          </article>;
        })}
      </div>
    </>}
  </section>;
}
