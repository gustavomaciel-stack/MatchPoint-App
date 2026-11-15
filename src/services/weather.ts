// The first release forecasts outdoor confrontations in Novo Hamburgo.
export async function getForecast(startsAt: string) {
  const localHour = new Date(Date.parse(startsAt) - 3 * 3600000).toISOString().slice(0, 13) + ':00';
  const date = localHour.slice(0, 10);
  const today = new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10);
  const daysAhead = (Date.parse(date) - Date.parse(today)) / 86400000;
  if (daysAhead < 0 || daysAhead >= 7) return null;

  const query = new URLSearchParams({
    latitude: '-29.68',
    longitude: '-51.13',
    timezone: 'America/Sao_Paulo',
    hourly: 'temperature_2m,precipitation_probability',
    start_date: date,
    end_date: date,
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('Previsão indisponível. Tente novamente.');
  const { hourly } = await response.json() as {
    hourly?: { time?: string[]; temperature_2m?: number[]; precipitation_probability?: number[] };
  };
  const index = hourly?.time?.indexOf(localHour) ?? -1;
  const temperature = hourly?.temperature_2m?.[index];
  const rain = hourly?.precipitation_probability?.[index];
  return typeof temperature === 'number' && typeof rain === 'number' && Number.isFinite(temperature) && Number.isFinite(rain) ? { temperature, rain } : null;
}
