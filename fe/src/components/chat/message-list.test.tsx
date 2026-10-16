import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeMessage } from '@/test/factories';
import { MessageList } from './message-list';

vi.mock('./message-bubble', () => ({
  MessageBubble: ({ message }: { message: { id: string } }) => <div id={`msg-${message.id}`} />,
}));

const base = {
  currentUserId: 'me',
  onReply: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onJumpTo: vi.fn(),
};

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe('MessageList jump', () => {
  it('stops requesting pages after a bounded number of failed attempts', () => {
    const onLoadMore = vi.fn();
    const onJumpHandled = vi.fn();
    const messages = [makeMessage({ id: 'm1' })];
    const props = { ...base, messages, hasMore: true, onLoadMore, onJumpHandled, jumpToId: 'missing' };
    const { rerender } = render(<MessageList {...props} isFetchingMore={false} />);
    // A failing fetchNextPage flips isFetchingMore true -> false without adding messages.
    for (let i = 0; i < 10; i++) {
      rerender(<MessageList {...props} isFetchingMore />);
      rerender(<MessageList {...props} isFetchingMore={false} />);
    }
    expect(onLoadMore.mock.calls.length).toBeLessThanOrEqual(3);
    expect(onJumpHandled).toHaveBeenCalled();
  });

  it('keeps paging while each page succeeds', () => {
    const onLoadMore = vi.fn();
    const onJumpHandled = vi.fn();
    const props = { ...base, hasMore: true, onLoadMore, onJumpHandled, jumpToId: 'missing', isFetchingMore: false };
    const { rerender } = render(<MessageList {...props} messages={[makeMessage({ id: 'm0' })]} />);
    for (let i = 1; i <= 6; i++) {
      rerender(<MessageList {...props} messages={[makeMessage({ id: 'm0' }), ...Array.from({ length: i }, (_, k) => makeMessage({ id: `o${k}` }))]} />);
    }
    expect(onLoadMore.mock.calls.length).toBe(7);
    expect(onJumpHandled).not.toHaveBeenCalled();
  });

  it('scrolls to a rendered target and reports it handled', () => {
    const onJumpHandled = vi.fn();
    const messages = [makeMessage({ id: 'm1' }), makeMessage({ id: 'm2' })];
    render(<MessageList {...base} messages={messages} hasMore={false} isFetchingMore={false} onLoadMore={vi.fn()} onJumpHandled={onJumpHandled} jumpToId="m2" />);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' });
    expect(onJumpHandled).toHaveBeenCalledTimes(1);
  });
});
