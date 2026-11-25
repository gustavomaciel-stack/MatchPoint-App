import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import type { Coordinates } from '../services/geo';

const icon = L.icon({
  iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow,
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const DEFAULT_CENTER: L.LatLngTuple = [-29.68, -51.13];

type Props = {
  position: Coordinates | null;
  onPick?: (position: Coordinates) => void;
  label?: string;
};

export function LocationMap({ position, onPick, label = 'Mapa do local da partida' }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map>(null);
  const marker = useRef<L.Marker>(null);
  const pick = useRef(onPick);
  pick.current = onPick;

  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, { scrollWheelZoom: Boolean(onPick) })
      .setView(DEFAULT_CENTER, 12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(instance);
    if (onPick) {
      instance.on('click', (event: L.LeafletMouseEvent) => {
        pick.current?.({ latitude: event.latlng.lat, longitude: event.latlng.lng });
      });
    }
    map.current = instance;
    return () => { instance.remove(); map.current = null; marker.current = null; };
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    if (!position) { marker.current?.remove(); marker.current = null; return; }

    const latLng = L.latLng(position.latitude, position.longitude);
    if (!marker.current) {
      marker.current = L.marker(latLng, { icon, draggable: Boolean(onPick), keyboard: false }).addTo(instance);
      marker.current.on('dragend', () => {
        const { lat, lng } = marker.current!.getLatLng();
        pick.current?.({ latitude: lat, longitude: lng });
      });
    } else {
      marker.current.setLatLng(latLng);
    }
    if (!instance.getBounds().contains(latLng) || instance.getZoom() < 15) {
      instance.setView(latLng, 17);
    }
  }, [position?.latitude, position?.longitude]);

  return <div ref={container} className="location-map" role="region" aria-label={label} />;
}
