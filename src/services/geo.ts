// Free public services, no API key needed:
// - ViaCEP turns a CEP into street, district, city and state.
// - Nominatim (OpenStreetMap) turns an address into coordinates.
//   Its usage policy allows at most one request per second, so we only
//   search when the user clicks a button, never on every keystroke.

export type CepResult = { street: string; district: string; city: string; state: string };
export type Coordinates = { latitude: number; longitude: number };

export function formatCep(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

export async function lookupCep(cep: string): Promise<CepResult> {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) throw new Error('Informe um CEP com 8 dígitos.');
  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error('Não foi possível consultar o CEP. Tente novamente.');
  const body = await response.json() as { erro?: unknown; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
  if (body.erro) throw new Error('CEP não encontrado.');
  return { street: body.logradouro ?? '', district: body.bairro ?? '', city: body.localidade ?? '', state: body.uf ?? '' };
}

export async function geocode(address: string): Promise<Coordinates | null> {
  const query = new URLSearchParams({ q: address, format: 'json', limit: '1', countrycodes: 'br', 'accept-language': 'pt-BR' });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${query}`, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error('Não foi possível buscar o endereço no mapa. Tente novamente.');
  const [first] = await response.json() as { lat: string; lon: string }[];
  if (!first) return null;
  return { latitude: Number(first.lat), longitude: Number(first.lon) };
}

export function mapsUrl(place: { latitude?: number | null; longitude?: number | null; address?: string | null; location: string }) {
  const query = place.latitude != null && place.longitude != null
    ? `${place.latitude},${place.longitude}`
    : place.address || place.location;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
