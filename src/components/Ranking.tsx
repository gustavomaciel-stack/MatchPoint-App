import { useEffect, useState } from 'react';
import { profileApi, type RankingEntry } from '../services/api';

const MEDALS = ['🥇', '🥈', '🥉'];

function Row({ entry, isMe, onOpenProfile }: { entry: RankingEntry; isMe: boolean; onOpenProfile: (id: string) => void }) {
  return <li className={`ranking-row ${isMe ? 'me' : ''}`}>
    <span className="ranking-position" aria-label={`${entry.position}º lugar`}>{MEDALS[entry.position - 1] ?? `${entry.position}º`}</span>
    <div className="ranking-player">
      <button type="button" className="link-button" onClick={() => onOpenProfile(entry.id)}>
        {entry.name}{isMe && ' (você)'}
      </button>
      <span className="muted">Nível {entry.level} · {entry.levelName}</span>
    </div>
    <span className="ranking-badges" aria-label={`${entry.badges.length} conquistas`}>
      {entry.badges.map((badge) => <span key={badge.id} title={badge.name} aria-hidden="true">{badge.icon}</span>)}
    </span>
    <strong className="ranking-xp">{entry.xp.toLocaleString('pt-BR')} XP</strong>
  </li>;
}

export function Ranking({ userId, onOpenProfile }: { userId: string; onOpenProfile: (id: string) => void }) {
  const [data, setData] = useState<{ top: RankingEntry[]; me: RankingEntry | null }>();
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    profileApi.ranking()
      .then((result) => { if (active) setData(result); })
      .catch((problem: unknown) => {
        if (active) setError(problem instanceof Error ? problem.message : 'Erro ao carregar o ranking.');
      });
    return () => { active = false; };
  }, []);

  const meInTop = data?.top.some((entry) => entry.id === userId);

  return <section>
    <div className="section-heading">
      <div>
        <p className="eyebrow">Gamificação</p>
        <h2>Ranking de jogadores</h2>
        <p className="muted">Ganhe XP organizando partidas, participando, jogando entre times e recebendo boas avaliações.</p>
      </div>
    </div>
    {error && <p className="error" role="alert">{error}</p>}
    {!data && !error && <p role="status">Carregando ranking…</p>}
    {data && (data.top.length === 0
      ? <p className="empty">Ninguém pontuou ainda. Organize ou participe de uma partida para estrear no ranking!</p>
      : <ol className="ranking-list">
        {data.top.map((entry) => <Row key={entry.id} entry={entry} isMe={entry.id === userId} onOpenProfile={onOpenProfile} />)}
      </ol>)}
    {data?.me && !meInTop && <>
      <h3 className="profile-heading">Sua posição</h3>
      <ol className="ranking-list"><Row entry={data.me} isMe onOpenProfile={onOpenProfile} /></ol>
    </>}
  </section>;
}
