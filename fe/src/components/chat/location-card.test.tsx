import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LocationCard } from './location-card';

vi.mock('next/dynamic', () => ({ default: () => () => <div data-testid="map" /> }));

describe('LocationCard', () => {
  it('shows the label, the map and a Google Maps link with the coordinates', () => {
    render(<LocationCard latitude={21.0285} longitude={105.8542} label="Hồ Gươm" />);
    expect(screen.getByText('Hồ Gươm')).toBeInTheDocument();
    expect(screen.getByTestId('map')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Google Maps/ })).toHaveAttribute(
      'href',
      'https://www.google.com/maps?q=21.0285,105.8542',
    );
  });

  it('works without a label', () => {
    render(<LocationCard latitude={1} longitude={2} />);
    expect(screen.getByText(/1\.0000, 2\.0000/)).toBeInTheDocument();
  });
});
