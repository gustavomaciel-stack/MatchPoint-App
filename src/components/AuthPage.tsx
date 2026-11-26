import { useState, type FormEvent } from 'react';
import { useCurrentUser } from '../context/CurrentUserContext';
import { registerUser } from '../services/api';

type Props = {
  invite?: 'match' | 'team-match' | null;
};

const HIGHLIGHTS = [
  ['📣', 'Crie a partida e mande o convite no grupo da turma'],
  ['📍', 'Encontre jogos com vagas e veja o local no mapa'],
  ['🤝', 'Monte seu time e desafie outros times'],
  ['🏆', 'Ganhe XP, conquistas e suba no ranking'],
] as const;

export function AuthPage({ invite = null }: Props) {
  const { loginUser } = useCurrentUser();
  const [mode, setMode] = useState<'login' | 'register'>(invite ? 'register' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        await registerUser({ name, email, password });
      }
      await loginUser(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível acessar a conta.');
      setLoading(false);
    }
  }

  function changeMode(nextMode: 'login' | 'register') {
    setMode(nextMode);
    setError('');
  }

  return (
    <section className="auth-page">
      <div className="auth-hero">
        <p className="eyebrow">Partidas entre amigos</p>
        <h2>Monte o jogo. Complete o time.</h2>
        <ul>
          {HIGHLIGHTS.map(([icon, text]) => <li key={text}><span aria-hidden="true">{icon}</span>{text}</li>)}
        </ul>
      </div>

      <div className="auth-card">
        {invite && <p className="invite-banner" role="status">
          {invite === 'match'
            ? '⚽ Você recebeu um convite para uma partida! Entre ou crie sua conta para ver os detalhes e confirmar presença.'
            : '🤝 Um time te desafiou! Entre ou crie sua conta para ver o confronto.'}
        </p>}
        <h2>{mode === 'login' ? 'Entrar na sua conta' : 'Criar conta grátis'}</h2>
        <p className="muted">
          {mode === 'login' ? 'Bom te ver de novo!' : 'Leva menos de um minuto.'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <label>
              Nome
              <input required autoComplete="name" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} />
            </label>
          )}

          <label>
            E-mail
            <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>

          <label>
            Senha
            <input
              required
              type="password"
              minLength={mode === 'register' ? 6 : undefined}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {mode === 'register' && <small className="field-hint">Mínimo de 6 caracteres.</small>}
          </label>

          {error && <p className="error" role="alert">{error}</p>}

          <button className="button" type="submit" disabled={loading}>
            {loading ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta e entrar'}
          </button>
        </form>

        <button className="auth-switch" type="button" onClick={() => changeMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Ainda não tenho conta' : 'Já tenho uma conta'}
        </button>
      </div>
    </section>
  );
}
