import { useEffect, useState } from 'react';

export type Route =
  | { name: 'explore'; tab: 'individual' | 'teams' }
  | { name: 'agenda' }
  | { name: 'teams' }
  | { name: 'ranking' }
  | { name: 'profile'; userId: string | null }
  | { name: 'match'; id: string }
  | { name: 'match-edit'; id: string }
  | { name: 'match-new' }
  | { name: 'team-match'; id: string }
  | { name: 'admin-users' };

export const paths = {
  explore: (tab: 'individual' | 'teams' = 'individual') => (tab === 'teams' ? '#/explorar/times' : '#/explorar'),
  agenda: () => '#/agenda',
  teams: () => '#/times',
  ranking: () => '#/ranking',
  profile: (userId?: string) => (userId ? `#/perfil/${encodeURIComponent(userId)}` : '#/perfil'),
  match: (id: string) => `#/partida/${encodeURIComponent(id)}`,
  matchEdit: (id: string) => `#/partida/${encodeURIComponent(id)}/editar`,
  matchNew: () => '#/partida/nova',
  teamMatch: (id: string) => `#/confronto/${encodeURIComponent(id)}`,
  adminUsers: () => '#/admin/usuarios',
};

export function parseHash(hash: string): Route {
  const [first = '', second = '', third = ''] = hash.replace(/^#\/?/, '').split('/').map((part) => {
    try {
      return decodeURIComponent(part);
    } catch {
      return part;
    }
  });

  switch (first) {
    case 'agenda': return { name: 'agenda' };
    case 'times': return { name: 'teams' };
    case 'ranking': return { name: 'ranking' };
    case 'perfil': return { name: 'profile', userId: second || null };
    case 'partida':
      if (second === 'nova') return { name: 'match-new' };
      if (second) return third === 'editar' ? { name: 'match-edit', id: second } : { name: 'match', id: second };
      break;
    case 'confronto':
      if (second) return { name: 'team-match', id: second };
      break;
    case 'admin':
      if (second === 'usuarios') return { name: 'admin-users' };
      break;
    case 'explorar':
      return { name: 'explore', tab: second === 'times' ? 'teams' : 'individual' };
  }
  return { name: 'explore', tab: 'individual' };
}

const notify = () => window.dispatchEvent(new HashChangeEvent('hashchange'));

export function navigate(path: string, { replace = false }: { replace?: boolean } = {}) {
  if (path === window.location.hash && !replace) return;
  if (replace) {
    window.history.replaceState(window.history.state, '', path);
  } else {
    window.history.pushState({ inApp: true }, '', path);
  }
  window.scrollTo(0, 0);
  notify();
}

export function goBack(fallback: string) {
  if ((window.history.state as { inApp?: boolean } | null)?.inApp) {
    window.history.back();
  } else {
    navigate(fallback, { replace: true });
  }
}

export function useRoute() {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));

  useEffect(() => {
    const update = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', update);
    window.addEventListener('popstate', update);
    return () => {
      window.removeEventListener('hashchange', update);
      window.removeEventListener('popstate', update);
    };
  }, []);

  return route;
}

export function shareUrl(path: string) {
  return `${window.location.origin}${window.location.pathname}${path}`;
}
