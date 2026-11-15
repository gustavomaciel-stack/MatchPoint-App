import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { SPORTS } from '../data/sports';
import { teamsApi } from '../services/api';
import type { Team, TeamMatch } from '../services/api';
import { currentBrasiliaMinute, isFutureBrasiliaTime } from '../data/matchSchedule';
import { getForecast } from '../services/weather';

const dateTime = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo',
});

function Forecast({ startsAt }: { startsAt: string }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const forecast = await getForecast(startsAt);
      setMessage(forecast
        ? `${forecast.temperature.toLocaleString('pt-BR')} °C · ${forecast.rain}% de chance de chuva`
        : 'Sem previsão para esse horário. A consulta cobre hoje e os próximos seis dias.');
    } catch {
      setMessage('Previsão indisponível. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return <div>
    <button type="button" className="button secondary" disabled={loading} onClick={() => void load()}>
      {loading ? 'Consultando…' : 'Consultar previsão'}
    </button>
    {message && <p role="status">{message} · <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a></p>}
  </div>;
}

export function TeamMatches({ userId, mode, matchId }: { userId: string; mode: 'browse' | 'manage' | 'detail'; matchId?: string }) {
  const [data, setData] = useState<{ teams: Team[]; matches: TeamMatch[] }>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<'team' | 'match'>();


  async function refresh() {
    const [teams, matches] = await Promise.all([teamsApi.mine(), teamsApi.matches()]);
    setData({ teams, matches });
  }

  useEffect(() => {
    void refresh().catch((problem: Error) => setError(problem.message));
  }, []);

  async function run(action: () => Promise<unknown>, afterSave?: () => void) {
    setBusy(true);
    setError('');
    try {
      await action();
      afterSave?.();
      await refresh();
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
      setError('Informe uma data e hora futura válida.');
      return;
    }
    void run(() => form === 'team'
      ? teamsApi.create({ name: value('name'), sport: value('sport'), memberCount: Number(value('memberCount')) })
      : teamsApi.publish({
        teamId: value('teamId'), location: value('location'), address: value('address'), startsAt: value('startsAt'),
        playersPerSide: Number(value('playersPerSide')), outdoor: fields.has('outdoor'),
      }), () => setForm(undefined));
  }

  const teams = data?.teams ?? [];
  const matches = data?.matches.filter((match) => Date.parse(match.startsAt) > Date.now()
    && (mode === 'detail' ? match.id === matchId : !match.cancelled && !match.opponent)) ?? [];

  return <section className="team-section">
    {mode === 'manage' && <h2>Meus times</h2>}
    {mode !== 'detail' && <div className="team-actions">
      {mode === 'manage'
        ? <button type="button" className="button" disabled={busy} onClick={() => setForm('team')}>Cadastrar time</button>
        : <button type="button" className="button" disabled={busy || !teams.length} onClick={() => setForm('match')}>Publicar confronto</button>}
    </div>}
    {mode === 'browse' && data && !teams.length && <p>Cadastre um time em Meus times para publicar ou aceitar um confronto.</p>}
    {error && <p className="error" role="alert">{error}</p>}
    {form && <form className="team-card team-form" onSubmit={submit}>
      <h3>{form === 'team' ? 'Novo time' : 'Novo confronto'}</h3>
      {form === 'team' ? <>
        <label>Nome do time<input name="name" maxLength={80} required /></label>
        <label>Esporte<select name="sport" required>{SPORTS.map(({ name }) => <option key={name}>{name}</option>)}</select></label>
        <label>Número de integrantes<input name="memberCount" type="number" min="1" max="100" required /></label>
      </> : <>
        <label>Time<select name="teamId" required>{teams.map((team) => <option value={team.id} key={team.id}>{team.name} · {team.sport}</option>)}</select></label>
        <label>Local em Novo Hamburgo<input name="location" maxLength={300} required /></label>
        <label>Endereço<input name="address" maxLength={300} placeholder="Rua, número, bairro, cidade e estado" required /></label>
        <label>Data e hora de Brasília<input name="startsAt" type="datetime-local" min={currentBrasiliaMinute()} required /></label>
        <label>Jogadores por lado<input name="playersPerSide" type="number" min="1" max="100" required /></label>
        <label className="team-check"><input name="outdoor" type="checkbox" /> Ao ar livre</label>
      </>}
      <div className="team-actions">
        <button className="button" disabled={busy}>Salvar</button>
        <button className="button secondary" type="button" disabled={busy} onClick={() => setForm(undefined)}>Voltar</button>
      </div>
    </form>}
    {!data && !error && <p role="status">Carregando times e confrontos…</p>}
    {data && <>
      {mode === 'manage' && (teams.length
        ? <div className="team-grid">{teams.map((team) => <article className="team-card" key={team.id}>
          <h3>{team.name}</h3><p>{team.sport} · {team.memberCount} integrantes</p>
        </article>)}</div>
        : <p>Você ainda não cadastrou um time.</p>)}
      {mode !== 'manage' && !matches.length && <p>{mode === 'detail' ? 'Confronto indisponível.' : 'Nenhum confronto buscando adversário.'}</p>}
      {mode !== 'manage' && matches.map((match) => {
        const expired = Date.parse(match.startsAt) <= Date.now();
        const own = match.host.ownerId === userId;
        const available = !match.cancelled && !expired && !match.opponent;
        const eligible = teams.filter((team) => team.sport === match.host.sport && team.memberCount >= match.playersPerSide);
        const status = match.cancelled ? 'Cancelado' : expired ? 'Horário encerrado' : match.opponent ? 'Confronto confirmado' : 'Buscando adversário';

        return <article key={match.id} className="team-card">
          <h3>{match.host.name}{match.opponent && ` × ${match.opponent.name}`}</h3>
          <p><strong>{status}</strong> · {match.host.sport} · {match.playersPerSide} × {match.playersPerSide}</p>
          <p>{dateTime.format(new Date(match.startsAt))} · {match.location}</p>
          {match.address && <p>{match.address}</p>}
          <div><a className="button secondary" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.address || `${match.location}, Novo Hamburgo`)}`} target="_blank" rel="noopener noreferrer">Abrir no Google Maps</a></div>
          {match.outdoor && !match.cancelled && !expired && <Forecast startsAt={match.startsAt} />}
          {available && !own && (eligible.length ? <form className="team-actions" onSubmit={(event) => {
            event.preventDefault();
            const teamId = String(new FormData(event.currentTarget).get('opponent'));
            void run(() => teamsApi.accept(match.id, teamId));
          }}>
            <label>Seu time <select name="opponent">{eligible.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
            <button className="button" disabled={busy}>Aceitar confronto</button>
          </form> : <p>Para aceitar, cadastre um time de {match.host.sport} com pelo menos {match.playersPerSide} integrantes.</p>)}
          {own && !expired && !match.cancelled && <button type="button" className="button secondary" disabled={busy} onClick={() => {
            if (window.confirm('Cancelar este confronto?')) void run(() => teamsApi.cancel(match.id));
          }}>Cancelar confronto</button>}
        </article>;
      })}
    </>}
  </section>;
}
