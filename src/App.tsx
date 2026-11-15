import { useState } from 'react';
import {
  CurrentUserProvider,
  useCurrentUser,
} from './context/CurrentUserContext';
import { AdminUsersPanel } from './components/AdminUsersPanel';
import { AuthPage } from './components/AuthPage';
import { Agenda } from './components/Agenda';
import { MatchList } from './components/MatchList';
import { MatchDetail } from './components/MatchDetail';
import { MatchForm } from './components/MatchForm';
import { TeamMatches } from "./components/TeamMatches";
import type { Match } from './services/api';
import './App.css';

type View = 'list' | 'my-matches' | 'detail' | 'create' | 'edit' | 'login' | 'admin-users' | 'teams' | 'team-detail';

function AppContent() {
  const { currentUserId, isAuthenticated, logoutUser, users, isAdmin, isRestoring, sessionError, retrySession } =
    useCurrentUser();

  const [requestedView, setView] = useState<View>('list');
  const view = isAuthenticated ? (requestedView === 'login' ? 'list' : requestedView) : 'login';
  const [exploreTab, setExploreTab] = useState<'individual' | 'teams'>('individual');
  const [returnView, setReturnView] = useState<'list' | 'my-matches'>('my-matches');
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [editingMatch, setEditingMatch] = useState<Match>();

  const currentUser = users.find((user) => user.id === currentUserId);

  if (isRestoring) return <main className="content" aria-live="polite">Recuperando sua sessão...</main>;
  if (sessionError && isAuthenticated) return <main className="content"><p className="error">{sessionError}</p><button className="button" onClick={retrySession}>Tentar novamente</button><button className="button secondary" onClick={logoutUser}>Ir para login</button></main>;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Partidas entre amigos</p>
          <h1><span className="brand-mark" aria-hidden="true">↗</span> MatchPoint<span className="brand-dot">.</span></h1>

          {view !== 'login' && isAuthenticated && (
            <p className="topbar-user">
              Olá, {currentUser?.name ?? 'jogador'}
            </p>
          )}
        </div>

        {view !== 'login' && (
          <nav className="topbar-actions" aria-label="Navegação principal">
            <button type="button" aria-current={view === 'list' ? 'page' : undefined} onClick={() => setView('list')}>Explorar</button>
            <button type="button" aria-current={view === 'my-matches' || view === 'team-detail' ? 'page' : undefined} onClick={() => setView('my-matches')}>Minhas partidas</button>
            <button type="button" aria-current={view === 'teams' ? 'page' : undefined} onClick={() => setView('teams')}>Meus times</button>
            <details className="account-menu">
              <summary>Conta</summary>
              <div>
                {isAdmin && <button type="button" onClick={() => setView('admin-users')}>Usuários</button>}
                <button type="button" onClick={() => { logoutUser(); setView('login'); }}>Sair</button>
              </div>
            </details>
          </nav>
        )}
      </header>

      <main className="content">
        {view === 'login' && (
          <AuthPage onSuccess={() => setView('list')} />
        )}

        {view === 'list' && <section>
          <div className="section-heading"><h2>Explorar</h2></div>
          <div className="view-filters" aria-label="Tipo de partida">
            <button type="button" aria-pressed={exploreTab === 'individual'} onClick={() => setExploreTab('individual')}>Vagas individuais</button>
            <button type="button" aria-pressed={exploreTab === 'teams'} onClick={() => setExploreTab('teams')}>Entre times</button>
          </div>
          {exploreTab === 'individual' ? <MatchList
            onCreate={() => { setReturnView('list'); setView('create'); }}
            onSelect={(id) => {
              setReturnView('list');
              setSelectedMatchId(id);
              setView('detail');
            }}
          /> : <TeamMatches userId={currentUserId} mode="browse" />}
        </section>}

        {view === 'admin-users' && <AdminUsersPanel onBack={() => setView('my-matches')} />}
        {view === 'teams' && <TeamMatches userId={currentUserId} mode="manage" />}
        {view === 'my-matches' && <Agenda userId={currentUserId}
          onSelect={(id, teamMatch) => {
            setReturnView('my-matches');
            setSelectedMatchId(id);
            setView(teamMatch ? 'team-detail' : 'detail');
          }}
        />}
        {view === 'team-detail' && <>
          <div className="section-heading">
            <h2>Detalhes do confronto</h2>
            <button type="button" className="button secondary" onClick={() => setView('my-matches')}>Voltar para a agenda</button>
          </div>
          <TeamMatches userId={currentUserId} mode="detail" matchId={selectedMatchId} />
        </>}

        {view === 'detail' && (
          <MatchDetail
            id={selectedMatchId}
            onBack={() => setView(returnView)}
            onEdit={(match) => {
              setEditingMatch(match);
              setView('edit');
            }}
          />
        )}

        {view === 'create' && (
          <MatchForm
            mode="create"
            onCancel={() => setView(returnView)}
            onSuccess={(id) => {
              setSelectedMatchId(id);
              setView('detail');
            }}
          />
        )}

        {view === 'edit' && editingMatch && (
          <MatchForm
            mode="edit"
            initialMatch={editingMatch}
            onCancel={() => setView('detail')}
            onSuccess={() => setView('detail')}
          />
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <CurrentUserProvider>
      <AppContent />
    </CurrentUserProvider>
  );
}

export default App;