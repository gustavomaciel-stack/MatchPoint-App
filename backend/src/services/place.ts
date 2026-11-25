import { AppError } from '../errors/AppError.js';

export type Place = { cep: string | null; latitude: number | null; longitude: number | null };

export function parsePlace(body: { cep?: unknown; latitude?: unknown; longitude?: unknown }): Place {
  let cep: string | null = null;
  if (body.cep != null && body.cep !== '') {
    const digits = typeof body.cep === 'string' ? body.cep.replace(/\D/g, '') : '';
    if (digits.length !== 8) throw new AppError('Informe um CEP com 8 dígitos.', 400);
    cep = digits;
  }

  const hasLat = body.latitude != null;
  const hasLng = body.longitude != null;
  if (!hasLat && !hasLng) return { cep, latitude: null, longitude: null };

  const { latitude, longitude } = body;
  if (typeof latitude !== 'number' || typeof longitude !== 'number'
    || !Number.isFinite(latitude) || !Number.isFinite(longitude)
    || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    throw new AppError('A posição no mapa é inválida. Marque o local novamente.', 400);
  }
  return { cep, latitude, longitude };
}
