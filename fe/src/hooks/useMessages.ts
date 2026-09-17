import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messageApi } from '@/lib/api/client';

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => messageApi.getConversations(),
    refetchInterval: 10_000, // poll every 10s for new messages
  });
}

export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => messageApi.getMessages(conversationId),
    enabled: !!conversationId,
    refetchInterval: 5_000, // poll every 5s for new messages
  });
}

export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => messageApi.sendMessage(conversationId, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', conversationId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useStartConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ targetUserId, content }: { targetUserId: string; content: string }) =>
      messageApi.startConversation(targetUserId, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
