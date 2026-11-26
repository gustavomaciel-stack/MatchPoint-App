import { useEffect, useState } from 'react';
import { teamsApi, type PersonRef, type TeamOverview } from '../services/api';
import { sportIcon } from '../data/sports';
import { plural } from '../data/format';
import { useToast } from '../context/ToastContext';

const shortDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'America/Sao_Paulo' });

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function TeamHeader({ team }: { team: TeamOverview }) {
  return <div className="team-head">
    <span className="sport-emblem small" aria-hidden="true">{sportIcon(team.sport)}</span>
    <div>
      <h4>{team.name}</h4>
      <p className="muted">
        {team.sport} · {plural(team.memberCount, 'integrante', 'integrantes')} · {plural(team.members.length, 'jogador no app', 'jogadores no app')}
      </p>
    </div>
  </div>;
}

type Props = { onOpenProfile: (userId: string) => void; onChanged?: () => void };

export function TeamCommunity({ onOpenProfile, onChanged }: Props) {
  const toast = useToast();
  const [teams, setTeams] = useState<TeamOverview[]>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    teamsApi.explore()
      .then((data) => { if (active) setTeams(data); })
      .catch((problem: unknown) => {
        if (active) setError(problem instanceof Error ? problem.message : 'Erro ao carregar os times.');
      });
    return () => { active = false; };
  }, []);

  async function run(action: () => Promise<unknown>, success: string, confirmMessage?: string) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setBusy(true);
    setError('');
    try {
      await action();
      setTeams(await teamsApi.explore());
      toast(success);
      onChanged?.();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Não foi possível concluir a solicitação.');
    } finally {
      setBusy(false);
    }
  }

  const person = (user: PersonRef) =>
    <button type="button" className="link-button" onClick={() => onOpenProfile(user.id)}>{user.name}</button>;

  if (!teams) {
    return <section className="team-section community">
      {error ? <p className="error" role="alert">{error}</p> : <p role="status">Carregando times…</p>}
    </section>;
  }

  const pending = teams.filter((team) => team.canManage && team.requests.length > 0);
  const pendingCount = pending.reduce((sum, team) => sum + team.requests.length, 0);
  const owned = teams.filter((team) => team.myStatus === 'DONO');
  const joined = teams.filter((team) => team.myStatus === 'APROVADA');
  const others = teams.filter((team) => team.myStatus !== 'DONO' && team.myStatus !== 'APROVADA'
    && normalize(`${team.name} ${team.sport} ${team.owner.name}`).includes(normalize(search.trim())));

  return <section className="team-section community">
    {error && <p className="error" role="alert">{error}</p>}

    {pendingCount > 0 && <div className="attention-box">
      <h3 className="profile-heading">Pedidos para entrar <span className="count-pill">{pendingCount}</span></h3>
      <div className="team-grid">
        {pending.map((team) => <article key={team.id} className="team-card">
          <TeamHeader team={team} />
          {team.myStatus !== 'DONO' && <p className="muted">Moderação do administrador</p>}
          <ul className="member-list">
            {team.requests.map((requestItem) => <li key={requestItem.id}>
              <div>{person(requestItem.user)} <span className="muted">pediu em {shortDate.format(new Date(requestItem.createdAt))}</span></div>
              <div className="team-actions">
                <button type="button" className="button small" disabled={busy}
                  onClick={() => void run(() => teamsApi.decide(requestItem.id, 'APROVADA'), `${requestItem.user.name} agora faz parte do ${team.name}!`)}>Aprovar</button>
                <button type="button" className="button danger small" disabled={busy}
                  onClick={() => void run(() => teamsApi.decide(requestItem.id, 'RECUSADA'), 'Pedido recusado.', `Recusar o pedido de ${requestItem.user.name}?`)}>Recusar</button>
              </div>
            </li>)}
          </ul>
        </article>)}
      </div>
    </div>}

    <h3 className="profile-heading">Seus times</h3>
    {owned.length === 0
      ? <p className="hint-box">Você ainda não tem um time. Cadastre um para publicar confrontos e receber jogadores.</p>
      : <div className="team-grid">
        {owned.map((team) => <article key={team.id} className="team-card">
          <TeamHeader team={team} />
          {team.members.length === 0
            ? <p className="muted">Nenhum jogador no app ainda. Quando alguém pedir para entrar, o pedido aparece aqui.</p>
            : <ul className="member-list">
              {team.members.map((member) => <li key={member.membershipId}>
                {person(member)}
                <button type="button" className="button secondary small" disabled={busy}
                  onClick={() => void run(() => teamsApi.removeMembership(member.membershipId), `${member.name} foi removido do time.`, `Remover ${member.name} de ${team.name}?`)}>Remover</button>
              </li>)}
            </ul>}
        </article>)}
      </div>}

    {joined.length > 0 && <>
      <h3 className="profile-heading">Times em que você joga</h3>
      <div className="team-grid">
        {joined.map((team) => <article key={team.id} className="team-card">
          <TeamHeader team={team} />
          <p>Responsável: {person(team.owner)}</p>
          <button type="button" className="button secondary small" disabled={busy}
            onClick={() => void run(() => teamsApi.removeMembership(team.myMembershipId!), `Você saiu do ${team.name}.`, `Sair de ${team.name}?`)}>Sair do time</button>
        </article>)}
      </div>
    </>}

    <h3 className="profile-heading">Encontrar times</h3>
    <p className="muted">Peça para entrar em um time. O responsável recebe o pedido e aprova.</p>
    <label className="community-search">Buscar por nome, esporte ou responsável
      <input type="search" value={search} placeholder="Ex.: futsal" onChange={(event) => setSearch(event.target.value)} />
    </label>
    {others.length === 0
      ? <p className="muted">{search ? 'Nenhum time encontrado com essa busca.' : 'Ainda não há times de outros jogadores.'}</p>
      : <div className="team-grid">
        {others.map((team) => <article key={team.id} className="team-card">
          <TeamHeader team={team} />
          <p>Responsável: {person(team.owner)}</p>
          {team.myStatus === null && <button type="button" className="button small" disabled={busy}
            onClick={() => void run(() => teamsApi.requestJoin(team.id), 'Pedido enviado! O responsável pelo time vai avaliar.')}>Pedir para entrar</button>}
          {team.myStatus === 'PENDENTE' && <div className="team-actions">
            <span className="agenda-status">⏳ Aguardando aprovação</span>
            <button type="button" className="button secondary small" disabled={busy}
              onClick={() => void run(() => teamsApi.removeMembership(team.myMembershipId!), 'Pedido cancelado.')}>Cancelar pedido</button>
          </div>}
          {team.myStatus === 'RECUSADA' && <div className="team-actions">
            <span className="agenda-status declined">Pedido recusado</span>
            <button type="button" className="button secondary small" disabled={busy}
              onClick={() => void run(() => teamsApi.requestJoin(team.id), 'Pedido enviado novamente!')}>Pedir novamente</button>
          </div>}
        </article>)}
      </div>}
  </section>;
}
