import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeMessage } from '@/test/factories';
import { MessageBubble } from './message-bubble';

vi.mock('next/dynamic', () => ({ default: () => () => <div data-testid="map" /> }));

const handlers = () => ({
  onReply: vi.fn(),
  onEdit: vi.fn().mockResolvedValue(undefined),
  onDelete: vi.fn().mockResolvedValue(undefined),
  onJumpTo: vi.fn(),
});
const renderBubble = (over = {}, isMine = true, h = handlers()) => {
  render(<MessageBubble message={makeMessage(over)} isMine={isMine} {...h} />);
  return h;
};

afterEach(() => vi.restoreAllMocks());

describe('MessageBubble', () => {
  it('renders links in text as anchors', () => {
    renderBubble({ content: 'xem https://a.com/x nhé' });
    expect(screen.getByRole('link', { name: 'https://a.com/x' })).toHaveAttribute('href', 'https://a.com/x');
  });

  it('offers reply/edit/delete on my text and only reply on theirs', () => {
    const { unmount } = render(<MessageBubble message={makeMessage()} isMine {...handlers()} />);
    expect(screen.getByRole('button', { name: 'Trả lời' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sửa' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xoá' })).toBeInTheDocument();
    unmount();
    render(<MessageBubble message={makeMessage()} isMine={false} {...handlers()} />);
    expect(screen.getByRole('button', { name: 'Trả lời' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sửa' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Xoá' })).toBeNull();
  });

  it('does not offer edit on non-text messages', () => {
    renderBubble({ type: 'LOCATION', content: '', latitude: 1, longitude: 2 });
    expect(screen.queryByRole('button', { name: 'Sửa' })).toBeNull();
    expect(screen.getByTestId('map')).toBeInTheDocument();
  });

  it('shows the recalled placeholder and no actions for deleted messages', () => {
    renderBubble({ content: null, deletedAt: '2026-10-14T04:00:00.000Z' });
    expect(screen.getByText('Tin nhắn đã bị thu hồi')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('marks edited messages', () => {
    renderBubble({ editedAt: '2026-10-14T04:00:00.000Z' });
    expect(screen.getByText('đã chỉnh sửa')).toBeInTheDocument();
  });

  it('shows the quoted message and jumps to it on click', async () => {
    const h = renderBubble({ replyTo: { id: 'orig', senderId: 'u2', type: 'TEXT', content: 'câu gốc', deleted: false } });
    await userEvent.click(screen.getByRole('button', { name: /câu gốc/ }));
    expect(h.onJumpTo).toHaveBeenCalledWith('orig');
  });

  it('shows a recalled quote when the original was deleted', () => {
    renderBubble({ replyTo: { id: 'orig', senderId: 'u2', type: 'TEXT', content: null, deleted: true } });
    expect(screen.getByRole('button', { name: /Tin nhắn đã bị thu hồi/ })).toBeInTheDocument();
  });

  it('edits inline and calls onEdit with the new text', async () => {
    const h = renderBubble({ id: 'm7', content: 'cũ' });
    await userEvent.click(screen.getByRole('button', { name: 'Sửa' }));
    const box = screen.getByRole('textbox', { name: 'Sửa tin nhắn' });
    await userEvent.clear(box);
    await userEvent.type(box, 'mới');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(h.onEdit).toHaveBeenCalledWith('m7', 'mới');
  });

  it('asks for confirmation before recalling', async () => {
    const confirm = vi.spyOn(window, 'confirm');
    const h = renderBubble({ id: 'm7' });
    confirm.mockReturnValueOnce(false);
    await userEvent.click(screen.getByRole('button', { name: 'Xoá' }));
    expect(h.onDelete).not.toHaveBeenCalled();
    confirm.mockReturnValueOnce(true);
    await userEvent.click(screen.getByRole('button', { name: 'Xoá' }));
    expect(h.onDelete).toHaveBeenCalledWith('m7');
  });

  it('renders images, files and listing previews', () => {
    renderBubble({
      type: 'FILE',
      content: '',
      attachments: [{ id: 'a1', url: 'https://s.test/a.pdf', name: 'báo giá.pdf', mimeType: 'application/pdf', size: 2048 }],
      listingPreviews: [{ id: 'l1', title: 'Lều', imageUrl: null, price: 1, currency: 'VND', location: 'ĐL' }],
    });
    expect(screen.getByRole('link', { name: /báo giá\.pdf/ })).toHaveAttribute('href', 'https://s.test/a.pdf');
    expect(screen.getByText('2.0 KB')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Lều/ })).toHaveAttribute('href', '/listings/l1');
  });
});
