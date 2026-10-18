import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it } from 'vitest';
import { makeMessage } from '@/test/factories';
import type { MessagePage } from '@/types/message';
import { applySocketEvent, markDeleted, markRead, messagesKey, upsertMessage } from './cache';

type Cache = { pages: MessagePage[]; pageParams: (string | undefined)[] };
let qc: QueryClient;
const seed = (items = [makeMessage({ id: 'm1' })]) =>
  qc.setQueryData<Cache>(messagesKey('c1'), { pages: [{ items, nextCursor: null }], pageParams: [undefined] });
const items = () => qc.getQueryData<Cache>(messagesKey('c1'))!.pages.flatMap((p) => p.items);

beforeEach(() => {
  qc = new QueryClient();
});

describe('upsertMessage', () => {
  it('prepends an unseen message to the first page', () => {
    seed();
    upsertMessage(qc, makeMessage({ id: 'm2' }));
    expect(items().map((m) => m.id)).toEqual(['m2', 'm1']);
  });

  it('replaces a known message in place (no duplicate from socket + REST)', () => {
    seed();
    upsertMessage(qc, makeMessage({ id: 'm1', content: 'đã sửa' }));
    expect(items()).toHaveLength(1);
    expect(items()[0].content).toBe('đã sửa');
  });

  it('ignores conversations that are not cached', () => {
    upsertMessage(qc, makeMessage({ conversationId: 'other' }));
    expect(qc.getQueryData(messagesKey('other'))).toBeUndefined();
  });
});

describe('markDeleted', () => {
  it('masks the message and flags replies to it', () => {
    seed([
      makeMessage({ id: 'm2', replyTo: { id: 'm1', senderId: 'u1', type: 'TEXT', content: 'gốc', deleted: false } }),
      makeMessage({ id: 'm1', content: 'gốc', attachments: [{ id: 'a', url: 'u', name: 'n', mimeType: 'image/png', size: 1 }] }),
    ]);
    markDeleted(qc, { id: 'm1', conversationId: 'c1', deletedAt: '2026-10-14T04:00:00.000Z' });
    const [reply, original] = items();
    expect(original).toMatchObject({ content: null, attachments: [], deletedAt: '2026-10-14T04:00:00.000Z' });
    expect(reply.replyTo).toMatchObject({ content: null, deleted: true });
  });
});

describe('markRead', () => {
  it("marks the other side's messages as read", () => {
    seed([makeMessage({ id: 'm1', senderId: 'u1' }), makeMessage({ id: 'm2', senderId: 'u2' })]);
    markRead(qc, { conversationId: 'c1', readerId: 'u2' });
    expect(items().map((m) => m.isRead)).toEqual([true, false]);
  });
});

describe('applySocketEvent', () => {
  it('routes events and invalidates conversations and shared history', () => {
    seed();
    qc.setQueryData(['conversations'], []);
    qc.setQueryData(['shared', 'c1', 'media'], {});
    applySocketEvent(qc, 'message:new', makeMessage({ id: 'm9' }));
    expect(items()[0].id).toBe('m9');
    expect(qc.getQueryState(['conversations'])?.isInvalidated).toBe(true);
    expect(qc.getQueryState(['shared', 'c1', 'media'])?.isInvalidated).toBe(true);
  });
});
