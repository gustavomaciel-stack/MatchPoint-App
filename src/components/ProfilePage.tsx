import { useEffect, useState, type FormEvent } from 'react';
import { profileApi, type Profile } from '../services/api';

type Props = {
  userId: string;
  onBack?: () => void;
  onOpenProfile: (userId: string) => void;
};

const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });
const monthYear = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });
const shortDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'America/Sao_Paulo' });

const XP_TIPS = [
  ['Organizar uma partida com pelo menos um participante', '+30 XP'],
  ['Confirmar presença em uma partida', '+20 XP'],
  ['Disputar um confronto entre times', '+25 XP'],
  ['Criar um time ou ser aceito em um (até 3 de cada)', '+10 XP'],
  ['Cada estrela recebida em avaliações', '+2 XP'],
] as const;

function Stars({ value }: { value: number }) {
  const rounded = Math.round(value);
  return <span className="stars" aria-label={`${value.toLocaleString('pt-BR')} de 5 estrelas`}>
    {[1, 2, 3, 4, 5].map((star) => <span key={star} aria-hidden="true" className={star <= rounded ? 'on' : ''}>★</span>)}
  </span>;
}

function RatingForm({ userId, initial, onSaved }: {
  userId: string;
  initial: Profile['ratings']['mine'];
  onSaved: () => Promise<void>;
}) {
  const [score, setScore] = useState(initial?.score ?? 0);
  const [comment, setComment] = useState(initial?.comment ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function run(task: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await task();
      await onSaved();
      setMessage(success);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Não foi possível salvar a avaliação.');
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!score) {
      setError('Escolha de 1 a 5 estrelas.');
      return;
    }
    void run(() => profileApi.rate(userId, score, comment), 'Avaliação salva.');
  }

  return <form className="rating-form" onSubmit={submit}>
    <fieldset className="star-picker">
      <legend>{initial ? 'Sua avaliação' : 'Avalie este jogador'}</legend>
      {[1, 2, 3, 4, 5].map((star) => <label key={star} className={star <= score ? 'on' : ''}>
        <input type="radio" name="score" value={star} checked={score === star} onChange={() => setScore(star)} />
        <span aria-hidden="true">★</span>
        <span className="sr-only">{star} {star === 1 ? 'estrela' : 'estrelas'}</span>
      </label>)}
    </fieldset>
    <label>Comentário (opcional)
      <textarea maxLength={500} rows={3} value={comment} placeholder="Pontualidade, fair play, espírito de equipe..."
        onChange={(event) => setComment(event.target.value)} />
    </label>
    {error && <p className="error" role="alert">{error}</p>}
    {message && <p className="muted" role="status">{message}</p>}
    <div className="team-actions">
      <button className="button" disabled={busy}>{initial ? 'Atualizar avaliação' : 'Enviar avaliação'}</button>
      {initial && <button type="button" className="button danger" disabled={busy}
        onClick={() => void run(async () => {
          await profileApi.unrate(userId);
          setScore(0);
          setComment('');
        }, 'Avaliação removida.')}>Remover</button>}
    </div>
  </form>;
}

export function ProfilePage({ userId, onBack, onOpenProfile }: Props) {
  const [profile, setProfile] = useState<Profile>();
  const [error, setError] = useState('');

  async function load() {
    setProfile(await profileApi.get(userId));
  }

  useEffect(() => {
    let active = true;
    profileApi.get(userId)
      .then((data) => { if (active) setProfile(data); })
      .catch((problem: unknown) => {
        if (active) setError(problem instanceof Error ? problem.message : 'Erro ao carregar o perfil.');
      });
    return () => { active = false; };
  }, [userId]);

  if (error) {
    return <section>
      <p className="error" role="alert">{error}</p>
      {onBack && <button type="button" className="button secondary" onClick={onBack}>Voltar</button>}
    </section>;
  }
  if (!profile) return <p role="status">Carregando perfil…</p>;

  const { user, gamification: game, history, ratings } = profile;
  const { level, stats } = game;
  const earned = game.badges.filter((badge) => badge.earned).length;
  const statItems = [
    ['Participações', stats.participations],
    ['Partidas organizadas', stats.organized],
    ['Confrontos de time', stats.teamGames],
    ['Esportes', stats.sports],
    ['Times criados', stats.teamsOwned],
    ['Times em que joga', stats.teamsJoined],
  ] as const;

  return <section className="profile">
    <div className="section-heading">
      <div>
        <p className="eyebrow">{profile.isSelf ? 'Meu perfil' : 'Perfil do jogador'}</p>
        <h2>{user.name}</h2>
      </div>
      {onBack && <button type="button" className="button secondary" onClick={onBack}>Voltar</button>}
    </div>

    <div className="profile-top">
      <article className="profile-card profile-identity">
        <div className="avatar" aria-hidden="true">{user.name.trim().charAt(0).toUpperCase()}</div>
        <div>
          <p className="muted">Membro desde {monthYear.format(new Date(user.createdAt))}</p>
          {user.email && <p className="muted">{user.email}</p>}
          {user.role === 'ADMIN' && <span className="role-badge role-admin">Administrador</span>}
          <p className="rating-summary">
            {ratings.average != null
              ? <><Stars value={ratings.average} /> <strong>{ratings.average.toLocaleString('pt-BR')}</strong> <span className="muted">({ratings.count} {ratings.count === 1 ? 'avaliação' : 'avaliações'})</span></>
              : <span className="muted">Ainda sem avaliações</span>}
          </p>
        </div>
      </article>

      <article className="profile-card level-card">
        <p className="eyebrow">Nível {level.number}</p>
        <h3>{level.name}</h3>
        <p className="xp-total"><strong>{game.xp.toLocaleString('pt-BR')}</strong> XP</p>
        <div className="xp-bar" role="progressbar" aria-label="Progresso para o próximo nível"
          aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level.progress * 100)}>
          <span style={{ width: `${Math.round(level.progress * 100)}%` }} />
        </div>
        <p className="muted">{level.nextXp != null
          ? `Faltam ${(level.nextXp - game.xp).toLocaleString('pt-BR')} XP para ${level.nextName}.`
          : 'Nível máximo alcançado!'}</p>
      </article>
    </div>

    <div className="stat-grid">
      {statItems.map(([label, value]) => <div key={label} className="stat">
        <strong>{value}</strong><span>{label}</span>
      </div>)}
    </div>

    <h3 className="profile-heading">Conquistas <span className="muted">{earned}/{game.badges.length}</span></h3>
    <div className="badge-grid">
      {game.badges.map((badge) => <article key={badge.id} className={`badge-card ${badge.earned ? 'earned' : 'locked'}`}>
        <span className="badge-icon" aria-hidden="true">{badge.icon}</span>
        <div>
          <h4>{badge.name} {badge.earned && <span className="sr-only">(conquistada)</span>}</h4>
          <p>{badge.description}</p>
          {!badge.earned && <div className="badge-progress" aria-label={`Progresso: ${badge.progress.current} de ${badge.progress.target}`}>
            <span style={{ width: `${(badge.progress.current / badge.progress.target) * 100}%` }} />
          </div>}
          {!badge.earned && <small>{badge.progress.current}/{badge.progress.target}</small>}
        </div>
      </article>)}
    </div>

    {profile.isSelf && <details className="xp-tips">
      <summary>Como ganhar XP</summary>
      <ul>{XP_TIPS.map(([action, xp]) => <li key={action}><span>{action}</span><strong>{xp}</strong></li>)}</ul>
    </details>}

    <h3 className="profile-heading">Avaliações</h3>
    {ratings.canRate && <RatingForm key={userId} userId={userId} initial={ratings.mine} onSaved={load} />}
    {ratings.items.length === 0
      ? <p className="muted">{profile.isSelf ? 'Você ainda não recebeu avaliações.' : 'Este jogador ainda não recebeu avaliações.'}</p>
      : <ul className="rating-list">
        {ratings.items.map((rating) => <li key={rating.id}>
          <div>
            <Stars value={rating.score} />
            <button type="button" className="link-button" onClick={() => onOpenProfile(rating.rater.id)}>{rating.rater.name}</button>
            <span className="muted">{shortDate.format(new Date(rating.updatedAt))}</span>
          </div>
          {rating.comment && <p>{rating.comment}</p>}
        </li>)}
      </ul>}

    <h3 className="profile-heading">Histórico de partidas</h3>
    {history.length === 0
      ? <p className="empty">Nenhuma partida disputada ainda. Assim que uma partida acontecer, ela aparece aqui.</p>
      : <div className="agenda-list">
        {history.map((entry) => <article key={`${entry.kind}-${entry.id}`} className="agenda-row history-row">
          <time dateTime={entry.startsAt}><strong>{dateTime.format(new Date(entry.startsAt))}</strong></time>
          <div>
            <h4>{entry.title}</h4>
            <p className="muted">{entry.location}{entry.detail ? ` · ${entry.detail}` : ''}</p>
          </div>
          <span className="agenda-status">{entry.role}</span>
          <span className="history-kind">{entry.kind === 'team' ? 'Entre times' : 'Individual'}</span>
        </article>)}
      </div>}
  </section>;
}
