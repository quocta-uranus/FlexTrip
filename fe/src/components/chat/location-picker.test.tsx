import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocationPicker } from './location-picker';

vi.mock('next/dynamic', () => ({
  default: () =>
    function FakeMap({ onChange }: { onChange: (p: { latitude: number; longitude: number }) => void }) {
      return <button onClick={() => onChange({ latitude: 10.5, longitude: 106.7 })}>chọn trên bản đồ</button>;
    },
}));

afterEach(() => vi.unstubAllGlobals());

function setup() {
  const onSubmit = vi.fn();
  const onOpenChange = vi.fn();
  render(<LocationPicker open onOpenChange={onOpenChange} onSubmit={onSubmit} />);
  return { onSubmit, onOpenChange };
}

describe('LocationPicker', () => {
  it('cannot send before a position is chosen', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Gửi vị trí' })).toBeDisabled();
  });

  it('sends the point picked on the map with an optional label', async () => {
    const { onSubmit, onOpenChange } = setup();
    await userEvent.click(screen.getByText('chọn trên bản đồ'));
    await userEvent.type(screen.getByLabelText('Tên địa điểm (tuỳ chọn)'), 'Điểm hẹn');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi vị trí' }));
    expect(onSubmit).toHaveBeenCalledWith({ latitude: 10.5, longitude: 106.7, locationLabel: 'Điểm hẹn' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('drops a whitespace-only label', async () => {
    const { onSubmit } = setup();
    await userEvent.click(screen.getByText('chọn trên bản đồ'));
    await userEvent.type(screen.getByLabelText('Tên địa điểm (tuỳ chọn)'), '   ');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi vị trí' }));
    expect(onSubmit).toHaveBeenCalledWith({ latitude: 10.5, longitude: 106.7, locationLabel: undefined });
  });

  it('uses the browser geolocation for the current position', async () => {
    vi.stubGlobal('navigator', {
      geolocation: { getCurrentPosition: (ok: (p: GeolocationPosition) => void) => ok({ coords: { latitude: 21, longitude: 105 } } as GeolocationPosition) },
    });
    const { onSubmit } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Dùng vị trí hiện tại' }));
    await userEvent.click(screen.getByRole('button', { name: 'Gửi vị trí' }));
    expect(onSubmit).toHaveBeenCalledWith({ latitude: 21, longitude: 105, locationLabel: undefined });
  });

  it('explains when location permission is denied', async () => {
    vi.stubGlobal('navigator', {
      geolocation: { getCurrentPosition: (_ok: unknown, fail: () => void) => fail() },
    });
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Dùng vị trí hiện tại' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/không lấy được vị trí/i);
  });

  it('explains when geolocation is unsupported', async () => {
    vi.stubGlobal('navigator', {});
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Dùng vị trí hiện tại' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/không hỗ trợ/i);
  });
});
