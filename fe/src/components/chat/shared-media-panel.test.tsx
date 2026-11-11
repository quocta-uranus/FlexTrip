import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SharedMediaPanel } from './shared-media-panel';

const ITEMS = {
  media: [
    { id: 'a1', messageId: 'm1', url: 'https://s.test/1.png', name: '1.png', mimeType: 'image/png', size: 10, createdAt: '' },
    { id: 'a2', messageId: 'm2', url: 'https://s.test/2.png', name: '2.png', mimeType: 'image/png', size: 10, createdAt: '' },
  ],
  files: [{ id: 'a3', messageId: 'm3', url: 'https://s.test/a.pdf', name: 'báo giá.pdf', mimeType: 'application/pdf', size: 1572864, createdAt: '' }],
  links: [
    { messageId: 'm4', url: 'https://example.com/a', createdAt: '', listingPreview: null },
    { messageId: 'm5', url: 'http://localhost:3000/listings/l1', createdAt: '', listingPreview: { id: 'l1', title: 'Lều 4 người', imageUrl: null, price: 1, currency: 'VND', location: 'ĐL' } },
    { messageId: 'm6', url: 'javascript:alert(1)', createdAt: '', listingPreview: null },
  ],
} as const;
let empty = false;
let isError = false;
let hasNextPage = false;
let isFetchingNextPage = false;
const refetch = vi.fn();
const fetchNextPage = vi.fn();

vi.mock('@/hooks/useMessages', () => ({
  useSharedItems: (_id: string, kind: keyof typeof ITEMS) => ({
    data: isError ? undefined : { pages: [{ items: empty ? [] : ITEMS[kind], nextCursor: null }] },
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading: false,
    isError,
    refetch,
  }),
}));

const setup = () => {
  const onJumpTo = vi.fn();
  render(<SharedMediaPanel conversationId="c1" onJumpTo={onJumpTo} onClose={vi.fn()} />);
  return onJumpTo;
};

describe('SharedMediaPanel', () => {
  it('shows images by default and jumps to the source message on click', async () => {
    const onJumpTo = setup();
    expect(screen.getAllByRole('img')).toHaveLength(2);
    await userEvent.click(screen.getAllByRole('button', { name: /Đến tin nhắn/ })[0]);
    expect(onJumpTo).toHaveBeenCalledWith('m1');
  });

  it('shows files with size and a download link', async () => {
    setup();
    await userEvent.click(screen.getByRole('tab', { name: 'File' }));
    expect(screen.getByText('báo giá.pdf')).toBeInTheDocument();
    expect(screen.getByText('1.5 MB')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Tải/ })).toHaveAttribute('href', 'https://s.test/a.pdf');
  });

  it('shows links, with a card for internal listing links, and never links non-http(s) urls', async () => {
    setup();
    await userEvent.click(screen.getByRole('tab', { name: 'Link' }));
    expect(screen.getByRole('link', { name: 'https://example.com/a' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Lều 4 người/ })).toHaveAttribute('href', '/listings/l1');
    expect(screen.getByText('javascript:alert(1)')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'javascript:alert(1)' })).toBeNull();
  });

  it('shows empty states', async () => {
    empty = true;
    setup();
    expect(screen.getByText('Chưa có ảnh nào')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'File' }));
    expect(screen.getByText('Chưa có file nào')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Link' }));
    expect(screen.getByText('Chưa có link nào')).toBeInTheDocument();
    empty = false;
  });

  it('offers a retry on error', async () => {
    isError = true;
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(refetch).toHaveBeenCalled();
    isError = false;
  });

  it('loads more once, and disables the button while a page is being fetched', async () => {
    hasNextPage = true;
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Xem thêm' }));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
    isFetchingNextPage = true;
    setup();
    expect(screen.getByRole('button', { name: 'Đang tải...' })).toBeDisabled();
    hasNextPage = false;
    isFetchingNextPage = false;
  });
});
