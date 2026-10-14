import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ListingPreviewCard } from './listing-preview-card';

describe('ListingPreviewCard', () => {
  it('links to the listing and shows title, location and formatted price', () => {
    render(
      <ListingPreviewCard
        preview={{ id: 'l1', title: 'Lều 4 người', imageUrl: 'https://img.test/1.jpg', price: 150000, currency: 'VND', location: 'Đà Lạt' }}
      />,
    );
    const link = screen.getByRole('link', { name: /Lều 4 người/ });
    expect(link).toHaveAttribute('href', '/listings/l1');
    expect(screen.getByText('Đà Lạt')).toBeInTheDocument();
    expect(screen.getByText(/150\.000/)).toBeInTheDocument();
  });

  it('renders without an image', () => {
    render(<ListingPreviewCard preview={{ id: 'l2', title: 'Xe', imageUrl: null, price: 1, currency: 'VND', location: 'HN' }} />);
    expect(screen.queryByRole('img')).toBeNull();
  });
});
