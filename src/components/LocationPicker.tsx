import { useState, type KeyboardEvent } from 'react';
import { LocationMap } from './LocationMap';
import { formatCep, geocode, lookupCep, type Coordinates } from '../services/geo';

export type PlaceValue = {
  address: string;
  cep: string;
  latitude: number | null;
  longitude: number | null;
};

type Props = { value: PlaceValue; onChange: (value: PlaceValue) => void; addressRequired?: boolean };

export function LocationPicker({ value, onChange, addressRequired = false }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [problem, setProblem] = useState('');
  const position = value.latitude != null && value.longitude != null
    ? { latitude: value.latitude, longitude: value.longitude } : null;

  async function run(task: () => Promise<void>) {
    setBusy(true); setProblem(''); setMessage('');
    try { await task(); } catch (error) {
      setProblem(error instanceof Error ? error.message : 'Não foi possível consultar o local.');
    } finally { setBusy(false); }
  }

  function placePin(coordinates: Coordinates | null, next: PlaceValue) {
    if (coordinates) {
      onChange({ ...next, ...coordinates });
      setMessage('Confira o pino no mapa. Se não estiver no lugar exato, arraste-o ou clique no ponto certo.');
    } else {
      onChange(next);
      setProblem('Não encontramos esse endereço no mapa. Clique no mapa para marcar o local manualmente.');
    }
  }

  const searchCep = () => run(async () => {
    const found = await lookupCep(value.cep);
    const street = [found.street, found.district].filter(Boolean).join(', ');
    const address = [street, `${found.city} - ${found.state}`].filter(Boolean).join(', ');
    const next = { ...value, address };
    placePin(await geocode([found.street, found.city, found.state].filter(Boolean).join(', ')), next);
    if (found.street) setMessage('Endereço preenchido pelo CEP. Acrescente o número e confira o pino no mapa.');
  });

  const searchAddress = () => run(async () => {
    if (!value.address.trim()) throw new Error('Digite um endereço para localizar no mapa.');
    placePin(await geocode(value.address), value);
  });

  function searchOnEnter(search: () => void) {
    return (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') { event.preventDefault(); if (!busy) search(); }
    };
  }

  return <fieldset className="location-picker">
    <legend>Onde vai ser o jogo?</legend>
    <div className="location-row">
      <label>CEP (opcional)
        <input inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" value={value.cep}
          onChange={(event) => onChange({ ...value, cep: formatCep(event.target.value) })}
          onKeyDown={searchOnEnter(() => void searchCep())} />
      </label>
      <button type="button" className="button secondary" disabled={busy || value.cep.replace(/\D/g, '').length !== 8}
        onClick={() => void searchCep()}>Buscar CEP</button>
    </div>
    <div className="location-row">
      <label>Endereço{addressRequired ? '' : ' (opcional)'}
        <input maxLength={300} required={addressRequired} placeholder="Rua, número, bairro, cidade e estado" value={value.address}
          onChange={(event) => onChange({ ...value, address: event.target.value })}
          onKeyDown={searchOnEnter(() => void searchAddress())} />
      </label>
      <button type="button" className="button secondary" disabled={busy} onClick={() => void searchAddress()}>
        {busy ? 'Buscando…' : 'Localizar no mapa'}
      </button>
    </div>
    <LocationMap position={position} onPick={(coordinates) => {
      onChange({ ...value, ...coordinates });
      setProblem('');
      setMessage('Local marcado no mapa.');
    }} />
    {problem ? <p className="error" role="alert">{problem}</p>
      : <p className="muted" role="status">{message || (position
        ? 'Local marcado. Arraste o pino ou clique no mapa para ajustar.'
        : 'Busque pelo CEP ou endereço, ou clique direto no mapa para marcar o local.')}</p>}
    <p className="map-credit">Busca de endereços: <a href="https://viacep.com.br/" target="_blank" rel="noreferrer">ViaCEP</a> e <a href="https://nominatim.openstreetmap.org/" target="_blank" rel="noreferrer">Nominatim</a></p>
  </fieldset>;
}

export function hasPin(value: PlaceValue) {
  return value.latitude != null && value.longitude != null;
}
