import { useToast } from '../context/ToastContext';

type Props = { url: string; title: string; text: string; highlight?: boolean };

export function ShareInvite({ url, title, text, highlight = false }: Props) {
  const toast = useToast();
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast('Link copiado! Cole no grupo da turma.', 'info');
    } catch {
      window.prompt('Copie o link do convite:', url);
    }
  }

  async function share() {
    try {
      await navigator.share({ title, text, url });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) void copy();
    }
  }

  return <article className={`share-invite ${highlight ? 'highlight' : ''}`}>
    <div>
      <h3>📣 Convide a turma</h3>
      <p className="muted">{highlight
        ? 'Sua partida está pronta! Mande o link para os amigos confirmarem presença.'
        : 'Mande o link para quem pode completar o time.'}</p>
    </div>
    <div className="share-actions">
      {canShare && <button type="button" className="button" onClick={() => void share()}>Compartilhar</button>}
      <a className="button whatsapp" href={whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>
      <button type="button" className="button secondary" onClick={() => void copy()}>Copiar link</button>
    </div>
  </article>;
}
