import { useEffect, useRef, useState } from 'react';
import { paths } from '../router';
import { Link } from './Link';

type Props = { name: string; isAdmin: boolean; onLogout: () => void };

export function UserMenu({ name, isAdmin, onLogout }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !root.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const firstName = name.trim().split(/\s+/)[0] || 'Conta';

  return <div className="user-menu" ref={root}>
    <button type="button" className="user-menu-trigger" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <span className="chip-avatar" aria-hidden="true">{firstName.charAt(0).toUpperCase()}</span>
      <span className="user-menu-name">{firstName}</span>
      <span aria-hidden="true">▾</span>
    </button>
    {open && <div className="user-menu-panel" role="menu">
      <Link role="menuitem" to={paths.profile()} onClick={() => setOpen(false)}>👤 Meu perfil</Link>
      {isAdmin && <Link role="menuitem" to={paths.adminUsers()} onClick={() => setOpen(false)}>🛡️ Usuários</Link>}
      <button type="button" role="menuitem" onClick={() => { setOpen(false); onLogout(); }}>↩ Sair</button>
    </div>}
  </div>;
}
