import { useCallback, useEffect, useState } from 'react';
import { CurrentUserProvider, useCurrentUser } from './context/CurrentUserContext';
import { ToastProvider } from './context/ToastContext';
import { AdminUsersPanel } from './components/AdminUsersPanel';
import { AuthPage } from './components/AuthPage';
import { Agenda } from './components/Agenda';
import { MatchList } from './components/MatchList';
import { MatchDetail } from './components/MatchDetail';
import { MatchForm } from './components/MatchForm';
import { TeamMatches } from './components/TeamMatches';
import { TeamCommunity } from './components/TeamCommunity';
import { ProfilePage } from './components/ProfilePage';
import { Ranking } from './components/Ranking';
import { UserMenu } from './components/UserMenu';
import { Link } from './components/Link';
import { getMatch, teamsApi, type Match } from './services/api';
import { goBack, navigate, paths, useRoute, type Route } from './router';
import './App.css';

const NAV_ITEMS = [
  { key: 'explore', label: 'Explorar', icon: '🔎', to: paths.explore() },
  { key: 'agenda', label: 'Minhas partidas', short: 'Agenda', icon: '📅', to: paths.agenda() },
  { key: 'teams', label: 'Meus times', short: 'Times', icon: '👥', to: paths.teams() },
  { key: 'ranking', label: 'Ranking', icon: '🏆', to: paths.ranking() },
] as const;

function sectionOf(route: Route) {
  switch (route.name) {
    case 'explore': case 'match': case 'match-new': case 'match-edit': return 'explore';
    case 'agenda': return 'agenda';
    case 'teams': case 'team-match': return 'teams';
    case 'ranking': return 'ranking';
    case 'profile': return 'profile';
    default: return null;
  }
}

function EditMatchRoute({ id, currentUserId }: { id: string; currentUserId: string }) {
  const [match, setMatch] = useState<Match>();
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getMatch(id)
      .then((data) => { if (active) setMatch(data); })
      .catch((problem: unknown) => { if (active) setError(problem instanceof Error ? problem.message : 'Erro ao carregar a partida.'); });
    return () => { active = false; };
  }, [id]);

  if (error) return <div className="empty"><p className="error">{error}</p><Link className="button" to={paths.explore()}>Voltar para Explorar</Link></div>;
  if (!match) return <p role="status">Carregando partida…</p>;
  if (match.organizerId !== currentUserId) {
    return <div className="empty"><p>Só quem organiza a partida pode editá-la.</p><Link className="button" to={paths.match(id)}>Ver partida</Link></div>;
  }
  return <MatchForm
    mode="edit"
    initialMatch={match}
    onCancel={() => goBack(paths.match(id))}
    onSuccess={() => navigate(paths.match(id), { replace: true })}
  />;
}

function AppContent() {
  const { currentUserId, currentUser, isAuthenticated, logoutUser, isAdmin, isRestoring, sessionError, retrySession } = useCurrentUser();
  const route = useRoute();
  const [pendingRequests, setPendingRequests] = useState(0);
  const [teamsVersion, setTeamsVersion] = useState(0);

  const refreshPending = useCallback(() => {
    teamsApi.explore()
      .then((teams) => setPendingRequests(teams.filter((team) => team.canManage).reduce((sum, team) => sum + team.requests.length, 0)))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    refreshPending();
    const timer = window.setInterval(refreshPending, 60000);
    return () => window.clearInterval(timer);
  }, [isAuthenticated, refreshPending]);

  const openProfile = (userId: string) => navigate(paths.profile(userId));
  const logout = () => {
    logoutUser();
    navigate(paths.explore(), { replace: true });
  };

  if (isRestoring) return <main className="content splash" aria-live="polite"><span className="brand-mark" aria-hidden="true">↗</span> Recuperando sua sessão…</main>;
  if (sessionError && isAuthenticated) {
    return <main className="content empty">
      <p className="error">{sessionError}</p>
      <div className="actions center">
        <button className="button" onClick={retrySession}>Tentar novamente</button>
        <button className="button secondary" onClick={logout}>Ir para o login</button>
      </div>
    </main>;
  }

  const section = sectionOf(route);
  const ownProfile = route.name === 'profile' && (!route.userId || route.userId === currentUserId);
  const brand = <Link className="brand" to={paths.explore()} aria-label="MatchPoint, ir para Explorar">
    <span className="brand-mark" aria-hidden="true">↗</span> MatchPoint<span className="brand-dot">.</span>
  </Link>;

  if (!isAuthenticated) {
    return <div className="app-shell">
      <header className="topbar"><h1>{brand}</h1></header>
      <main className="content">
        <AuthPage invite={route.name === 'match' ? 'match' : route.name === 'team-match' ? 'team-match' : null} />
      </main>
    </div>;
  }

  const badge = (key: string) => key === 'teams' && pendingRequests > 0
    ? <span className="nav-badge" aria-label={`${pendingRequests} pedidos pendentes`}>{pendingRequests}</span>
    : null;

  return <div className="app-shell">
    <header className="topbar">
      <h1>{brand}</h1>
      <nav className="topbar-actions" aria-label="Navegação principal">
        {NAV_ITEMS.map((item) => <Link key={item.key} to={item.to} aria-current={section === item.key ? 'page' : undefined}>
          {item.label}{badge(item.key)}
        </Link>)}
      </nav>
      <UserMenu name={currentUser?.name ?? ''} isAdmin={isAdmin} onLogout={logout} />
    </header>

    <main className="content">
      {route.name === 'explore' && <section>
        <div className="section-heading">
          <div>
            <h2>Explorar</h2>
            <p className="muted">Olá, {currentUser?.name?.split(' ')[0] ?? 'jogador'}! Bora jogar hoje?</p>
          </div>
        </div>
        <div className="view-filters" role="tablist" aria-label="Tipo de partida">
          <Link role="tab" className="filter-tab" aria-selected={route.tab === 'individual'} to={paths.explore('individual')}>Vagas individuais</Link>
          <Link role="tab" className="filter-tab" aria-selected={route.tab === 'teams'} to={paths.explore('teams')}>Entre times</Link>
        </div>
        {route.tab === 'individual' ? <MatchList /> : <TeamMatches userId={currentUserId} mode="browse" />}
      </section>}

      {route.name === 'agenda' && <Agenda userId={currentUserId} />}

      {route.name === 'teams' && <>
        <TeamMatches userId={currentUserId} mode="manage" onChanged={() => setTeamsVersion((value) => value + 1)} />
        <TeamCommunity key={teamsVersion} onOpenProfile={openProfile} onChanged={refreshPending} />
      </>}

      {route.name === 'team-match' && <section>
        <button type="button" className="back-link" onClick={() => goBack(paths.agenda())}>← Voltar</button>
        <TeamMatches key={route.id} userId={currentUserId} mode="detail" matchId={route.id} />
      </section>}

      {route.name === 'ranking' && <Ranking userId={currentUserId} onOpenProfile={openProfile} />}

      {route.name === 'profile' && <ProfilePage
        key={route.userId ?? currentUserId}
        userId={route.userId ?? currentUserId}
        onOpenProfile={openProfile}
        onBack={route.userId && route.userId !== currentUserId ? () => goBack(paths.ranking()) : undefined}
      />}

      {route.name === 'match' && <MatchDetail
        key={route.id}
        id={route.id}
        onBack={() => goBack(paths.explore())}
        onOpenProfile={openProfile}
        onEdit={(id) => navigate(paths.matchEdit(id))}
      />}

      {route.name === 'match-new' && <MatchForm
        mode="create"
        onCancel={() => goBack(paths.explore())}
        onSuccess={(id) => navigate(paths.match(id), { replace: true })}
      />}

      {route.name === 'match-edit' && <EditMatchRoute key={route.id} id={route.id} currentUserId={currentUserId} />}

      {route.name === 'admin-users' && <AdminUsersPanel onBack={() => goBack(paths.explore())} />}
    </main>

    <nav className="tabbar" aria-label="Navegação inferior">
      {NAV_ITEMS.map((item) => <Link key={item.key} to={item.to} aria-current={section === item.key ? 'page' : undefined}>
        <span className="tab-icon" aria-hidden="true">{item.icon}{badge(item.key)}</span>
        <span>{'short' in item ? item.short : item.label}</span>
      </Link>)}
      <Link to={paths.profile()} aria-current={ownProfile ? 'page' : undefined}>
        <span className="tab-icon" aria-hidden="true">👤</span>
        <span>Perfil</span>
      </Link>
    </nav>
  </div>;
}

function App() {
  return (
    <ToastProvider>
      <CurrentUserProvider>
        <AppContent />
      </CurrentUserProvider>
    </ToastProvider>
  );
}

export default App;
