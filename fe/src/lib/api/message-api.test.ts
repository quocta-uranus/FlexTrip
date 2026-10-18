import { beforeEach, describe, expect, it, vi } from 'vitest';
import { messageApi } from './client';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset().mockImplementation(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
});
const call = () => ({ url: fetchMock.mock.calls[0][0] as string, init: fetchMock.mock.calls[0][1] as RequestInit });

describe('messageApi', () => {
  it('starts a conversation with only the target user', async () => {
    await messageApi.startConversation('u2');
    expect(call().url).toMatch(/\/messages\/conversations$/);
    expect(JSON.parse(call().init.body as string)).toEqual({ targetUserId: 'u2' });
  });

  it('pages history with cursor and limit', async () => {
    await messageApi.getMessages('c1', 'm9');
    expect(call().url).toMatch(/\/messages\/conversations\/c1\?cursor=m9&limit=30$/);
  });

  it('edits and deletes by message id', async () => {
    await messageApi.editMessage('m1', 'mới');
    expect(call().url).toMatch(/\/messages\/m1$/);
    expect(call().init.method).toBe('PATCH');
    fetchMock.mockClear();
    await messageApi.deleteMessage('m1');
    expect(call().init.method).toBe('DELETE');
  });

  it('uploads files as multipart field "files"', async () => {
    await messageApi.uploadAttachments('c1', [new File(['x'], 'a.png', { type: 'image/png' })]);
    expect(call().url).toMatch(/\/messages\/conversations\/c1\/attachments$/);
    expect((call().init.body as FormData).getAll('files')).toHaveLength(1);
  });

  it('requests shared history by kind', async () => {
    await messageApi.shared('c1', 'links');
    expect(call().url).toMatch(/\/shared\?kind=links&limit=30$/);
  });
});
