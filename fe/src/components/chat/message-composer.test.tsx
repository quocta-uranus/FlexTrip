import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, type Mock } from 'vitest';
import { makeMessage } from '@/test/factories';
import type { AttachmentInput } from '@/types/message';
import { MessageComposer } from './message-composer';

vi.mock('next/dynamic', () => ({ default: () => () => null }));

const uploaded: AttachmentInput = { url: 'https://s.test/1.png', name: 'a.png', mimeType: 'image/png', size: 10 };

function setup(over: Partial<React.ComponentProps<typeof MessageComposer>> = {}) {
  const props = {
    replyTo: null,
    onCancelReply: vi.fn(),
    onSend: vi.fn().mockResolvedValue(undefined),
    onUpload: vi.fn().mockResolvedValue([uploaded]),
    ...over,
  };
  render(<MessageComposer {...props} />);
  return { ...props, onSend: props.onSend as Mock, onUpload: props.onUpload as Mock };
}
const box = () => screen.getByRole('textbox', { name: 'Nhập tin nhắn' });
const png = () => new File(['x'], 'a.png', { type: 'image/png' });
const pdf = () => new File(['y'], 'b.pdf', { type: 'application/pdf' });

describe('MessageComposer', () => {
  it('sends trimmed text and clears the box', async () => {
    const p = setup();
    await userEvent.type(box(), '  xin chào ');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi' }));
    expect(p.onSend).toHaveBeenCalledWith({ type: 'TEXT', content: 'xin chào', replyToId: undefined });
    await waitFor(() => expect(box()).toHaveValue(''));
  });

  it('sends on Enter but not on Shift+Enter', async () => {
    const p = setup();
    await userEvent.type(box(), 'a{Shift>}{Enter}{/Shift}b');
    expect(p.onSend).not.toHaveBeenCalled();
    await userEvent.type(box(), '{Enter}');
    expect(p.onSend).toHaveBeenCalledTimes(1);
  });

  it('does not send an empty message', async () => {
    const p = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Gửi' }));
    expect(p.onSend).not.toHaveBeenCalled();
  });

  it('ignores a second submit while the first is still sending', async () => {
    let release!: () => void;
    const onSend = vi.fn().mockReturnValue(new Promise<void>((r) => (release = r)));
    setup({ onSend });
    await userEvent.type(box(), 'hi{Enter}{Enter}');
    expect(onSend).toHaveBeenCalledTimes(1);
    release();
  });

  it('shows the reply bar, sends replyToId and can cancel', async () => {
    const p = setup({ replyTo: makeMessage({ id: 'orig', content: 'câu gốc', sender: { id: 'u2', name: 'Bình', avatarUrl: null } }) });
    expect(screen.getByText(/Bình/)).toBeInTheDocument();
    expect(screen.getByText(/câu gốc/)).toBeInTheDocument();
    await userEvent.type(box(), 'ok{Enter}');
    expect(p.onSend).toHaveBeenCalledWith({ type: 'TEXT', content: 'ok', replyToId: 'orig' });
    await userEvent.click(screen.getByRole('button', { name: 'Huỷ trả lời' }));
    expect(p.onCancelReply).toHaveBeenCalled();
  });

  it('uploads selected images then sends an IMAGE message with the caption', async () => {
    const p = setup();
    await userEvent.upload(screen.getByLabelText('Chọn file'), png());
    expect(screen.getByText('a.png')).toBeInTheDocument();
    await userEvent.type(box(), 'ảnh nè');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi' }));
    await waitFor(() =>
      expect(p.onSend).toHaveBeenCalledWith({ type: 'IMAGE', content: 'ảnh nè', replyToId: undefined, attachments: [uploaded] }),
    );
    expect(p.onUpload).toHaveBeenCalledWith([expect.any(File)]);
  });

  it('sends files with an empty caption', async () => {
    const p = setup();
    await userEvent.upload(screen.getByLabelText('Chọn file'), png());
    await userEvent.click(screen.getByRole('button', { name: 'Gửi' }));
    await waitFor(() => expect(p.onSend).toHaveBeenCalledWith({ type: 'IMAGE', content: '', replyToId: undefined, attachments: [uploaded] }));
  });

  it('removes a selected file', async () => {
    setup();
    await userEvent.upload(screen.getByLabelText('Chọn file'), png());
    await userEvent.click(screen.getByRole('button', { name: 'Bỏ a.png' }));
    expect(screen.queryByText('a.png')).not.toBeInTheDocument();
  });

  it('splits images and other files into two messages, caption on the first', async () => {
    const p = setup({ onUpload: vi.fn().mockResolvedValueOnce([uploaded]).mockResolvedValueOnce([{ ...uploaded, name: 'b.pdf', mimeType: 'application/pdf' }]) });
    await userEvent.upload(screen.getByLabelText('Chọn file'), [png(), pdf()]);
    await userEvent.click(screen.getByRole('button', { name: 'Gửi' }));
    await waitFor(() => expect(p.onSend).toHaveBeenCalledTimes(2));
    expect(p.onSend.mock.calls[0][0].type).toBe('IMAGE');
    expect(p.onSend.mock.calls[1][0].type).toBe('FILE');
  });

  it('on a mid-way failure keeps only the unsent group and never resends the sent one', async () => {
    const onUpload = vi.fn().mockResolvedValueOnce([uploaded]).mockRejectedValueOnce(new Error('Upload lỗi')).mockResolvedValueOnce([{ ...uploaded, name: 'b.pdf' }]);
    const p = setup({ onUpload });
    await userEvent.upload(screen.getByLabelText('Chọn file'), [png(), pdf()]);
    await userEvent.type(box(), 'cap');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Upload lỗi');
    expect(p.onSend).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('a.png')).not.toBeInTheDocument();
    expect(screen.getByText('b.pdf')).toBeInTheDocument();
    expect(box()).toHaveValue('');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi' }));
    await waitFor(() => expect(p.onSend).toHaveBeenCalledTimes(2));
    expect(p.onSend.mock.calls[1][0]).toMatchObject({ type: 'FILE', content: '' });
    expect(onUpload).toHaveBeenCalledTimes(3);
  });

  it('blocks files that are too big', async () => {
    const p = setup();
    const big = png();
    Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 });
    await userEvent.upload(screen.getByLabelText('Chọn file'), big);
    expect(screen.getByRole('alert')).toHaveTextContent(/10MB/);
    await userEvent.click(screen.getByRole('button', { name: 'Gửi' }));
    expect(p.onUpload).not.toHaveBeenCalled();
  });

  it('accepts a valid file after a rejected one and clears the error', async () => {
    setup();
    const big = png();
    Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 });
    await userEvent.upload(screen.getByLabelText('Chọn file'), big);
    await userEvent.upload(screen.getByLabelText('Chọn file'), pdf());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('b.pdf')).toBeInTheDocument();
  });

  it('refuses an over-long caption instead of silently dropping it', async () => {
    const p = setup();
    await userEvent.upload(screen.getByLabelText('Chọn file'), png());
    await userEvent.click(box());
    await userEvent.paste('a'.repeat(4001));
    await userEvent.click(screen.getByRole('button', { name: 'Gửi' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/4000/);
    expect(p.onUpload).not.toHaveBeenCalled();
  });

  it('prefills text once and keeps the draft when sending fails', async () => {
    const p = setup({ initialText: 'http://localhost:3000/listings/l1', onSend: vi.fn().mockRejectedValue(new Error('Mạng lỗi')) });
    expect(box()).toHaveValue('http://localhost:3000/listings/l1');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Mạng lỗi');
    expect(box()).toHaveValue('http://localhost:3000/listings/l1');
    expect(p.onSend).toHaveBeenCalledTimes(1);
  });
});
