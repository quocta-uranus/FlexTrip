import { CreditCard, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PaymentMethod } from '@/types/wallet';

const BRAND_ICON: Record<PaymentMethod['brand'], { node: React.ReactNode; bg: string }> = {
  visa: { node: <CreditCard className="size-5 text-sec-600" strokeWidth={1.8} />, bg: 'bg-sec-50' },
  mastercard: { node: <CreditCard className="size-5 text-sec-600" strokeWidth={1.8} />, bg: 'bg-sec-50' },
  momo: { node: <span className="font-heading text-sm font-bold text-[#D82D8B]">M</span>, bg: 'bg-[#FDEEF7]' },
  zalopay: { node: <span className="font-heading text-sm font-bold text-[#0068FF]">Z</span>, bg: 'bg-[#E9F1FF]' },
};

export function PaymentMethodRow({ method }: { method: PaymentMethod }) {
  const icon = BRAND_ICON[method.brand];

  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-card px-4 py-4">
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${icon.bg}`}>{icon.node}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{method.label}</p>
        <p className="text-xs text-muted-foreground">{method.detail}</p>
      </div>
      {method.isDefault ? (
        <Badge className="bg-secondary text-secondary-foreground">Mặc định</Badge>
      ) : (
        <button type="button" className="text-xs font-semibold text-sec-600 hover:text-foreground">
          Đặt làm mặc định
        </button>
      )}
      <Button variant="ghost" size="icon" aria-label={`Xoá ${method.label}`} className="text-muted-foreground hover:text-destructive">
        <Trash2 className="size-4" strokeWidth={1.8} />
      </Button>
    </div>
  );
}
