import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentMethodRow } from '@/components/profile/payment-method-row';
import { TransactionRow } from '@/components/profile/transaction-row';
import { WalletBalanceCard } from '@/components/profile/wallet-balance-card';
import { mockPaymentMethods, mockTransactions, mockWalletSummary } from './_data';

export default function PaymentsPage() {
  return (
    <>
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">Thanh toán &amp; Ví</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Quản lý thẻ ngân hàng, ví điện tử liên kết và theo dõi số dư ví nội bộ FlexTrip của bạn.
        </p>
      </div>

      <WalletBalanceCard summary={mockWalletSummary} />

      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-foreground">Thẻ &amp; ví liên kết</h2>
          <Button variant="outline" size="sm" className="rounded-full border-sec-300 text-sec-600 hover:bg-sec-50 hover:text-sec-600">
            <Plus className="size-3.5" strokeWidth={2.2} />
            Thêm phương thức
          </Button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {mockPaymentMethods.map((method) => (
            <PaymentMethodRow key={method.id} method={method} />
          ))}

          <button
            type="button"
            className="mt-1 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-sec-200 bg-background py-3.5 text-sm font-semibold text-sec-600 transition-colors hover:bg-sec-50"
          >
            <Plus className="size-4" strokeWidth={2.2} />
            Thêm phương thức thanh toán mới
          </button>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-foreground">Giao dịch gần đây</h2>
          <button type="button" className="text-sm font-semibold text-sec-600 hover:text-sec-600/80">
            Xem tất cả
          </button>
        </div>

        <div className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {mockTransactions.map((transaction) => (
            <TransactionRow key={transaction.id} transaction={transaction} />
          ))}
        </div>
      </section>
    </>
  );
}
