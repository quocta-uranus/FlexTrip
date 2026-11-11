import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MessagesPage from './page';

let search = new URLSearchParams();
const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useSearchParams: () => search,
  useRouter: () => ({ replace }),
}));
vi.mock('@/hooks/use-chat-socket', () => ({ useChatSocket: () => undefined }));
vi.mock('@/hooks/useMessages', () => ({
  useConversations: () => ({ data: [{ id: 'c1' }, { id: 'c2' }], isLoading: false }),
  useConversation: () => ({ data: undefined }),
}));
vi.mock('@/store/auth.store', () => ({ useAuthStore: () => ({ user: { id: 'me' } }) }));
vi.mock('@/components/chat/conversation-list', () => ({
  ConversationList: ({ onSelect }: { onSelect: (id: string) => void }) => (
    <button onClick={() => onSelect('c2')}>pick c2</button>
  ),
}));
vi.mock('@/components/chat/chat-window', () => ({
  ChatWindow: ({ conversationId, initialText }: { conversationId: string; initialText?: string }) => (
    <div data-testid="win">{conversationId}|{initialText ?? ''}</div>
  ),
}));

beforeEach(() => {
  replace.mockClear();
  search = new URLSearchParams();
});

describe('MessagesPage', () => {
  it('defaults to the first conversation', () => {
    render(<MessagesPage />);
    expect(screen.getByTestId('win')).toHaveTextContent('c1|');
  });

  it('follows later changes of ?c=', () => {
    search = new URLSearchParams('c=c1');
    const { rerender } = render(<MessagesPage />);
    expect(screen.getByTestId('win')).toHaveTextContent('c1|');
    search = new URLSearchParams('c=c2');
    rerender(<MessagesPage />);
    expect(screen.getByTestId('win')).toHaveTextContent('c2|');
  });

  it('selecting writes the id to the URL and switches instantly', async () => {
    render(<MessagesPage />);
    await userEvent.click(screen.getByText('pick c2'));
    expect(replace).toHaveBeenCalledWith('/messages?c=c2');
    expect(screen.getByTestId('win')).toHaveTextContent('c2|');
  });

  it('prefills only the matching conversation, once, and strips listing without losing c', async () => {
    search = new URLSearchParams('c=c1&listing=L9');
    render(<MessagesPage />);
    expect(screen.getByTestId('win').textContent).toMatch(/^c1\|.*\/listings\/L9$/);
    expect(replace).toHaveBeenCalledWith('/messages?c=c1');
    await act(async () => userEvent.click(screen.getByText('pick c2')));
    expect(screen.getByTestId('win')).toHaveTextContent('c2|');
    search = new URLSearchParams('c=c1');
    await act(async () => undefined);
    // back to c1 later: prefill is spent
    await userEvent.click(screen.getByText('pick c2'));
    expect(screen.getByTestId('win').textContent).toBe('c2|');
  });
});
