import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { messageApi } from '@/lib/api/client';
import { markDeleted, messagesKey, upsertMessage } from '@/lib/chat/cache';
import { useChatStore } from '@/store/chat.store';
import type { SendMessageInput, SharedKind } from '@/types/message';

// While the socket is down, fall back to polling; while it is up, events keep the cache fresh.
function useFallbackInterval(ms: number) {
  return useChatStore((s) => (s.connected ? false : ms));
}

export function useConversations() {
  const refetchInterval = useFallbackInterval(10_000);
  return useQuery({ queryKey: ['conversations'], queryFn: () => messageApi.getConversations(), refetchInterval });
}

export function useConversation(id: string | null) {
  return useQuery({
    queryKey: ['conversation', id],
    queryFn: () => messageApi.getConversation(id as string),
    enabled: !!id,
  });
}

export function useMessages(conversationId: string) {
  const refetchInterval = useFallbackInterval(5_000);
  return useInfiniteQuery({
    queryKey: messagesKey(conversationId),
    queryFn: ({ pageParam }) => messageApi.getMessages(conversationId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: !!conversationId,
    refetchInterval,
  });
}

export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SendMessageInput) => messageApi.sendMessage(conversationId, body),
    onSuccess: (message) => {
      upsertMessage(qc, message);
      qc.invalidateQueries({ queryKey: ['conversations'] });
      qc.invalidateQueries({ queryKey: ['shared', conversationId] });
    },
  });
}

export function useEditMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => messageApi.editMessage(id, content),
    onSuccess: (message) => upsertMessage(qc, message),
  });
}

export function useDeleteMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => messageApi.deleteMessage(id),
    onSuccess: (_res, id) => {
      markDeleted(qc, { id, conversationId, deletedAt: new Date().toISOString() });
      qc.invalidateQueries({ queryKey: ['conversations'] });
      qc.invalidateQueries({ queryKey: ['shared', conversationId] });
    },
  });
}

export function useUploadAttachments(conversationId: string) {
  return useMutation({ mutationFn: (files: File[]) => messageApi.uploadAttachments(conversationId, files) });
}

export function useSharedItems(conversationId: string, kind: SharedKind) {
  return useInfiniteQuery({
    queryKey: ['shared', conversationId, kind],
    queryFn: ({ pageParam }) => messageApi.shared(conversationId, kind, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useStartConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: string) => messageApi.startConversation(targetUserId),
    onSuccess: (conversation) => {
      qc.setQueryData(['conversation', conversation.id], conversation);
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useMarkRead(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => messageApi.markRead(conversationId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });
}
