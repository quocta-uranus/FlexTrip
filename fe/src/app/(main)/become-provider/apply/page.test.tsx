import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ApplyProviderPage from './page';

const mocked = vi.hoisted(() => ({
  state: 'NEEDS_UPDATE',
  user: { id: 'u1', name: 'Trần Nguyễn Đạt', phone: '', email: 'dat@example.com', roles: ['TRAVELER'] },
  // Same object on every render, like the query cache gives the page.
  application: {
    id: 'a1', status: 'REJECTED', adminNote: 'Vui lòng bổ sung ảnh giấy tờ.', name: 'Trần Nguyễn Đạt', phone: '0901234567',
    email: 'dat@example.com', city: 'Đà Nẵng', categories: ['CAMPING'], description: 'Cho thuê lều', createdAt: '2026-10-21T00:00:00Z', updatedAt: '2026-10-21T00:00:00Z',
  },
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));
vi.mock('@/lib/api/client', () => ({ providerApplicationApi: { submit: vi.fn() } }));
vi.mock('@/store/auth.store', () => ({
  useAuthStore: (select: (s: unknown) => unknown) =>
    select({ isAuthenticated: true, user: mocked.user }),
}));
vi.mock('@/hooks/useProviderApplication', () => ({
  useProviderEntry: () => ({
    isLoading: false,
    entry: { state: mocked.state },
    application: mocked.application,
  }),
}));

async function goToReview() {
  const view = render(<QueryClientProvider client={new QueryClient()}><ApplyProviderPage /></QueryClientProvider>);
  if (mocked.state === 'NONE') {
    // A first application starts empty, so the required fields are filled in by hand.
    await userEvent.type(screen.getByLabelText('Số điện thoại'), '0901234567');
  }
  await userEvent.click(screen.getByRole('button', { name: /Tiếp tục/ }));
  if (mocked.state === 'NONE') {
    await userEvent.click(screen.getByRole('radio', { name: 'Đà Nẵng' }));
    await userEvent.click(screen.getByRole('button', { name: /Camping/ }));
  }
  await userEvent.click(screen.getByRole('button', { name: /Tiếp tục/ }));
  return view;
}

describe('ApplyProviderPage review step', () => {
  beforeEach(() => { mocked.state = 'NEEDS_UPDATE'; });

  it('says "Gửi lại hồ sơ" and keeps the old application as history when resubmitting', async () => {
    await goToReview();
    expect(screen.getByRole('button', { name: 'Gửi lại hồ sơ' })).toBeInTheDocument();
    expect(screen.getByText(/Hồ sơ cũ vẫn được lưu làm lịch sử/)).toBeInTheDocument();
    expect(screen.queryByText(/yêu cầu bổ sung thông tin/)).toBeNull();
  });

  it('keeps "Gửi đăng ký" for a first application and does not promise requests for more information', async () => {
    mocked.state = 'NONE';
    await goToReview();
    expect(screen.getByRole('button', { name: 'Gửi đăng ký' })).toBeInTheDocument();
    expect(screen.queryByText(/Hồ sơ cũ vẫn được lưu/)).toBeNull();
    expect(screen.queryByText(/yêu cầu bổ sung thông tin/)).toBeNull();
  });
});
