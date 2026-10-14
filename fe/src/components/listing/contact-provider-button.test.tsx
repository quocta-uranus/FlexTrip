import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/auth.store';
import { ContactProviderButton } from './contact-provider-button';

const push = vi.fn();
const mutateAsync = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }), usePathname: () => '/listings/l1' }));
vi.mock('@/hooks/useMessages', () => ({ useStartConversation: () => ({ mutateAsync, isPending: false, error: null }) }));

const signIn = (id: string, roles: string[]) =>
  useAuthStore.setState({ isAuthenticated: true, user: { id, roles } as never });

beforeEach(() => {
  push.mockReset();
  mutateAsync.mockReset().mockResolvedValue({ id: 'conv1' });
  useAuthStore.setState({ isAuthenticated: false, user: null });
  localStorage.clear();
});

describe('ContactProviderButton', () => {
  it('starts a conversation with the provider and opens it with the listing prefilled', async () => {
    signIn('t1', ['TRAVELER']);
    render(<ContactProviderButton providerId="p1" listingId="l1" />);
    await userEvent.click(screen.getByRole('button', { name: /Liên hệ Provider/ }));
    expect(mutateAsync).toHaveBeenCalledWith('p1');
    expect(push).toHaveBeenCalledWith('/messages?c=conv1&listing=l1');
  });

  it('sends anonymous visitors to login and back', async () => {
    render(<ContactProviderButton providerId="p1" listingId="l1" />);
    await userEvent.click(screen.getByRole('button', { name: /Liên hệ Provider/ }));
    expect(push).toHaveBeenCalledWith('/login?redirect=%2Flistings%2Fl1');
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('is hidden for providers, non-travelers and the listing owner', () => {
    signIn('x', ['PROVIDER']);
    const { unmount, container } = render(<ContactProviderButton providerId="p1" listingId="l1" />);
    expect(container).toBeEmptyDOMElement();
    unmount();
    signIn('a', ['ADMIN']);
    const second = render(<ContactProviderButton providerId="p1" listingId="l1" />);
    expect(second.container).toBeEmptyDOMElement();
    second.unmount();
    signIn('p1', ['TRAVELER']);
    const third = render(<ContactProviderButton providerId="p1" listingId="l1" />);
    expect(third.container).toBeEmptyDOMElement();
  });

  it('is hidden while a stored session is still being restored', () => {
    localStorage.setItem('flextrip_rt', 'rt');
    const { container } = render(<ContactProviderButton providerId="p1" listingId="l1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('ignores a second click while the first is in flight', async () => {
    signIn('t1', ['TRAVELER']);
    mutateAsync.mockReset().mockReturnValue(new Promise(() => {}));
    render(<ContactProviderButton providerId="p1" listingId="l1" />);
    await userEvent.dblClick(screen.getByRole('button', { name: /Liên hệ Provider/ }));
    expect(mutateAsync).toHaveBeenCalledTimes(1);
  });

  it('does not navigate when starting fails', async () => {
    signIn('t1', ['TRAVELER']);
    mutateAsync.mockReset().mockRejectedValue(new Error('boom'));
    render(<ContactProviderButton providerId="p1" listingId="l1" />);
    await userEvent.click(screen.getByRole('button', { name: /Liên hệ Provider/ }));
    expect(push).not.toHaveBeenCalled();
  });
});
