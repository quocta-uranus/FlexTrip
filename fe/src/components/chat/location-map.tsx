'use client';

import 'leaflet/dist/leaflet.css';
import { CircleMarker, MapContainer, TileLayer } from 'react-leaflet';

// CircleMarker avoids Leaflet's default marker icon, whose image URLs break under bundlers.
export default function LocationMap({ latitude, longitude, className }: { latitude: number; longitude: number; className?: string }) {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={15}
      scrollWheelZoom={false}
      dragging={false}
      doubleClickZoom={false}
      zoomControl={false}
      className={className ?? 'h-36 w-full rounded-lg'}
    >
      <TileLayer attribution="&copy; OpenStreetMap" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <CircleMarker center={[latitude, longitude]} radius={8} pathOptions={{ color: '#2a7bd9', fillOpacity: 0.9 }} />
    </MapContainer>
  );
}
