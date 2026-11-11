import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { makeMessage } from '@/test/factories';
import type { Conversation } from '@/types/message';
import { ConversationList } from './conversation-list';

const conv = (over: Partial<Conversation> = {}): Conversation => ({
  id: 'c1',
  createdAt: '',
  updatedAt: '',
  members: [
    { userId: 'me', joinedAt: '', user: { id: 'me', name: 'Tôi', avatarUrl: null } },
    { userId: 'u2', joinedAt: '', user: { id: 'u2', name: 'Shop Seed 1', avatarUrl: null } },
  ],
  lastMessage: makeMessage({ content: 'chào bạn' }),
  unreadCount: 0,
  ...over,
});

describe('ConversationList', () => {
  it('shows the other member, last message and unread badge, and selects on click', async () => {
    const onSelect = vi.fn();
    render(<ConversationList conversations={[conv({ unreadCount: 3 })]} isLoading={false} activeId={null} currentUserId="me" onSelect={onSelect} />);
    expect(screen.getByText('Shop Seed 1')).toBeInTheDocument();
    expect(screen.getByText('chào bạn')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Shop Seed 1/ }));
    expect(onSelect).toHaveBeenCalledWith('c1');
  });

  it('labels media and recalled last messages', () => {
    render(
      <ConversationList
        conversations={[conv({ lastMessage: makeMessage({ type: 'IMAGE', content: '' }) }), conv({ id: 'c2', lastMessage: makeMessage({ content: null, deletedAt: '2026-10-14T04:00:00.000Z' }) })]}
        isLoading={false}
        activeId={null}
        currentUserId="me"
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText('[Ảnh]')).toBeInTheDocument();
    expect(screen.getByText('Tin nhắn đã bị thu hồi')).toBeInTheDocument();
  });

  it('shows the empty state', () => {
    render(<ConversationList conversations={[]} isLoading={false} activeId={null} currentUserId="me" onSelect={vi.fn()} />);
    expect(screen.getByText('Chưa có cuộc trò chuyện nào.')).toBeInTheDocument();
  });

  it('caps the unread badge and falls back when the other member is missing', () => {
    render(
      <ConversationList
        conversations={[conv({ unreadCount: 150, members: [{ userId: 'me', joinedAt: '', user: { id: 'me', name: 'Tôi', avatarUrl: null } }] })]}
        isLoading={false}
        activeId="c1"
        currentUserId="me"
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText('99+')).toBeInTheDocument();
    expect(screen.getByText('Người dùng')).toBeInTheDocument();
  });
});
