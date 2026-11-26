import { currentBrasiliaMinute, isFutureBrasiliaTime } from '../data/matchSchedule';
import { SPORTS } from '../data/sports';
import { useState, type FormEvent } from 'react';
import { createMatch, updateMatch, type Match } from '../services/api';
import { useCurrentUser } from '../context/CurrentUserContext';
import { useToast } from '../context/ToastContext';
import { LocationPicker, hasPin, type PlaceValue } from './LocationPicker';
import { formatCep } from '../services/geo';

type Props = { mode: 'create' | 'edit'; initialMatch?: Match; onSuccess: (id: string) => void; onCancel: () => void };

export function MatchForm({ mode, initialMatch, onSuccess, onCancel }: Props) {
  const { currentUserId } = useCurrentUser();
  const toast = useToast();
  const [form, setForm] = useState({ sport: initialMatch?.sport ?? '', location: initialMatch?.location ?? '', date: initialMatch?.date.slice(0, 10) ?? '', time: initialMatch?.time ?? '', vacancies: String(initialMatch?.vacancies ?? 10) });
  const [selectedSport, setSelectedSport] = useState(initialMatch?.sport ? (SPORTS.some((item) => item.name === initialMatch.sport) ? initialMatch.sport : 'other') : '');
  const [isFree, setIsFree] = useState(!(initialMatch?.pricePerPerson));
  const [price, setPrice] = useState(initialMatch?.pricePerPerson ? (initialMatch.pricePerPerson / 100).toFixed(2) : '');
  const [place, setPlace] = useState<PlaceValue>({ address: initialMatch?.address ?? '', cep: formatCep(initialMatch?.cep ?? ''), latitude: initialMatch?.latitude ?? null, longitude: initialMatch?.longitude ?? null });
  const [notes, setNotes] = useState(initialMatch?.notes ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!currentUserId) { setError('Sua sessão expirou. Entre novamente para continuar.'); return; }
    if (!form.sport.trim()) { setError('Escolha um esporte para continuar.'); return; }
    if (!hasPin(place)) { setError('Marque o local da partida no mapa para continuar.'); return; }
    if (!isFutureBrasiliaTime(`${form.date}T${form.time}`)) { setError('Escolha uma data e um horário que ainda não passaram.'); return; }
    const amount = isFree ? 0 : Math.round(Number(price.replace(',', '.')) * 100);
    if (!isFree && (!Number.isFinite(amount) || amount <= 0 || amount > 100000000)) {
      setError('Informe um valor por pessoa maior que zero ou selecione Grátis.'); return;
    }
    setLoading(true); setError('');
    try {
      const data = { ...form, ...place, cep: place.cep || null, pricePerPerson: amount, notes, vacancies: Number(form.vacancies), organizerId: currentUserId };
      const match = mode === 'create' ? await createMatch(data) : await updateMatch(initialMatch!.id, data);
      toast(mode === 'create' ? 'Partida criada! Agora é só convidar a turma. 📣' : 'Alterações salvas.');
      onSuccess(match.id);
    } catch (err) { setError(err instanceof Error ? err.message : 'Erro ao salvar partida.'); } finally { setLoading(false); }
  }

  return <section className="form-section">
    <p className="eyebrow">{mode === 'create' ? 'Nova partida' : 'Editar partida'}</p>
    <h2>{mode === 'create' ? 'Bora marcar um jogo?' : 'Ajuste sua partida'}</h2>
    <p className="muted">Escolha o esporte, combine os detalhes e reúna a turma.</p>
    <form className="match-form" onSubmit={handleSubmit}>
      <fieldset className="sport-picker">
        <legend>01 · Escolha o esporte</legend>
        <div className="sport-options">
          {SPORTS.map((sport) => <button key={sport.name} type="button" className={`sport-option ${selectedSport === sport.name ? 'selected' : ''}`} aria-pressed={selectedSport === sport.name} onClick={() => { setSelectedSport(sport.name); setForm({ ...form, sport: sport.name }); }}><span aria-hidden="true">{sport.icon}</span>{sport.name}</button>)}
          <button type="button" className={`sport-option ${selectedSport === 'other' ? 'selected' : ''}`} aria-pressed={selectedSport === 'other'} onClick={() => { setSelectedSport('other'); setForm({ ...form, sport: '' }); }}><span aria-hidden="true">🏅</span>Outro</button>
        </div>
      </fieldset>
      {selectedSport === 'other' && <label>Nome do esporte<input required maxLength={80} placeholder="Qual esporte você quer organizar?" value={form.sport} onChange={(event) => setForm({ ...form, sport: event.target.value })} /></label>}

      <h3 className="form-divider">02 · Quando e onde</h3>
      <div className="form-row">
        <label>Data<input required type="date" min={currentBrasiliaMinute().slice(0, 10)} value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
        <label>Horário<input required type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} /></label>
        <label>Vagas para participantes
          <input required min="1" max="1000" type="number" value={form.vacancies} onChange={(event) => setForm({ ...form, vacancies: event.target.value })} />
          <small className="field-hint">Quantas pessoas, além de você, podem confirmar.</small>
        </label>
      </div>
      <label>Nome do local<input required maxLength={300} placeholder="Ex.: Quadra do Parcão" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></label>
      <LocationPicker value={place} onChange={setPlace} />

      <h3 className="form-divider">03 · Combine os detalhes</h3>
      <div className="form-row two">
        <label>Cobrança<select value={isFree ? 'free' : 'paid'} onChange={(event) => setIsFree(event.target.value === 'free')}><option value="free">Grátis</option><option value="paid">Pago por pessoa</option></select></label>
        {!isFree && <label>Valor por pessoa (R$)<input type="number" required min="0.01" max="1000000" step="0.01" placeholder="Ex.: 15,00" value={price} onChange={(event) => setPrice(event.target.value)} /></label>}
      </div>
      <label>Observações (opcional)<textarea maxLength={2000} rows={4} placeholder="Regras, o que levar, nível do jogo, como será o pagamento…" value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      {!isFree && <p className="muted">O valor é informativo: o pagamento é combinado diretamente com você.</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="form-actions">
        <button className="button secondary" type="button" onClick={onCancel}>Cancelar</button>
        <button className="button" disabled={loading}>{loading ? 'Salvando…' : mode === 'create' ? 'Criar partida' : 'Salvar alterações'}</button>
      </div>
    </form>
  </section>;
}
