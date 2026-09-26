import { useQuery, useMutation, useQueryClient } from"@tanstack/react-query";
import { walletApi, paymentMethodApi } from"@/lib/api/client";

// Wallet balance
export function useWalletBalance() {
  return useQuery({
    queryKey: ["wallet","balance"],
    queryFn: walletApi.getBalance,
  });
}

// Wallet transactions
export function useWalletTransactions(limit = 20) {
  return useQuery({
    queryKey: ["wallet","transactions", limit],
    queryFn: () => walletApi.getTransactions(limit),
  });
}

// Deposit
export function useWalletDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ amount, paymentMethodId }: { amount: number; paymentMethodId?: string }) =>
      walletApi.deposit(amount, paymentMethodId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

// Withdraw
export function useWalletWithdraw() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ amount }: { amount: number }) => walletApi.withdraw(amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

// Payment methods
export function usePaymentMethods() {
  return useQuery({
    queryKey: ["payment-methods"],
    queryFn: paymentMethodApi.list,
  });
}

export function useAddPaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: paymentMethodApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment-methods"] });
    },
  });
}

export function useDeletePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: paymentMethodApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment-methods"] });
    },
  });
}
