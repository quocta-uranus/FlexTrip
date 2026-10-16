'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';

export interface Point {
  latitude: number;
  longitude: number;
}

function Interactions({ position, onChange }: { position: Point | null; onChange: (p: Point) => void }) {
  const map = useMap();
  useMapEvents({ click: (e) => onChange({ latitude: e.latlng.lat, longitude: e.latlng.lng }) });
  useEffect(() => {
    if (position) map.setView([position.latitude, position.longitude], Math.max(map.getZoom(), 15));
  }, [map, position]);
  return null;
}

export default function LocationPickerMap({ position, onChange }: { position: Point | null; onChange: (p: Point) => void }) {
  return (
    <MapContainer center={[16.047, 108.206]} zoom={5} className="h-72 w-full rounded-lg">
      <TileLayer attribution="&copy; OpenStreetMap" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {position && <CircleMarker center={[position.latitude, position.longitude]} radius={9} pathOptions={{ color: '#2a7bd9', fillOpacity: 0.9 }} />}
      <Interactions position={position} onChange={onChange} />
    </MapContainer>
  );
}
