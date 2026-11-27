import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProviderStatusPage from './page';

const mocked = vi.hoisted(() => ({ state: 'PENDING', adminNote: null as string | null }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));
vi.mock('@/lib/api/client', () => ({ userApi: { me: vi.fn(() => Promise.resolve({ roles: ['PROVIDER'] })) } }));
vi.mock('@/store/auth.store', () => ({
  useAuthStore: (select: (s: unknown) => unknown) => select({ user: { roles: ['TRAVELER'] }, setUser: vi.fn() }),
}));
vi.mock('@/hooks/useProviderApplication', () => ({
  useProviderEntry: () => ({
    isLoading: false,
    entry: { state: mocked.state },
    application: {
      id: 'a1', status: 'PENDING', adminNote: mocked.adminNote, name: 'Trần Nguyễn Đạt', phone: '0901234567', email: 'dat@example.com',
      city: 'Đà Nẵng', categories: ['CAMPING'], description: 'Cho thuê lều và đồ cắm trại', createdAt: '2026-10-21T00:00:00Z', updatedAt: '2026-10-21T00:00:00Z',
    },
  }),
}));

describe('ProviderStatusPage', () => {
  beforeEach(() => { mocked.state = 'PENDING'; mocked.adminNote = null; });

  it('lets the applicant read back what they sent', () => {
    render(<ProviderStatusPage />);
    expect(screen.getByText('Thông tin đã gửi')).toBeInTheDocument();
    expect(screen.getByText('Trần Nguyễn Đạt')).toBeInTheDocument();
    expect(screen.getByText('dat@example.com')).toBeInTheDocument();
    expect(screen.getByText('Cho thuê lều và đồ cắm trại')).toBeInTheDocument();
    expect(screen.getByText('Chờ duyệt')).toBeInTheDocument();
  });

  it('links back to the Provider introduction page', () => {
    render(<ProviderStatusPage />);
    expect(screen.getByRole('link', { name: 'Xem lại thông tin về Provider' })).toHaveAttribute('href', '/become-provider');
  });

  it('shows the reason and a resubmit action when the application was not approved', () => {
    mocked.state = 'NEEDS_UPDATE';
    mocked.adminNote = 'Vui lòng bổ sung ảnh giấy tờ.';
    render(<ProviderStatusPage />);
    expect(screen.getByText('Hồ sơ chưa được duyệt')).toBeInTheDocument();
    expect(screen.getByText('Lý do từ chối')).toBeInTheDocument();
    expect(screen.getByText(/Vui lòng bổ sung ảnh giấy tờ\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Gửi lại hồ sơ/ })).toHaveAttribute('href', '/become-provider/apply');
    expect(screen.queryByText('Tiến trình')).toBeNull();
  });

  it('offers the Provider area once approved', () => {
    mocked.state = 'APPROVED';
    render(<ProviderStatusPage />);
    expect(screen.getByRole('link', { name: /Chuyển sang Provider/ })).toHaveAttribute('href', '/dashboard');
  });
});
