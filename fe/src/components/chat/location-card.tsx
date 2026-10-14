'use client';

import dynamic from 'next/dynamic';

const LocationMap = dynamic(() => import('./location-map'), {
  ssr: false,
  loading: () => <div className="h-36 w-full animate-pulse rounded-lg bg-[#e2e8f3]" />,
});

export function LocationCard({ latitude, longitude, label }: { latitude: number; longitude: number; label?: string | null }) {
  return (
    <div className="w-64 overflow-hidden rounded-xl border border-[#DCEFFB] bg-white p-2 text-[#0f1729]">
      <LocationMap latitude={latitude} longitude={longitude} />
      <p className="mt-2 truncate text-sm font-semibold">{label || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`}</p>
      <a
        href={`https://www.google.com/maps?q=${latitude},${longitude}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-medium text-[#2a7bd9] underline"
      >
        Mở Google Maps
      </a>
    </div>
  );
}
