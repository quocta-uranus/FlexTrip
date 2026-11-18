'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useInvoice } from '@/hooks/usePayments';
import { CATEGORY_LABELS } from '@/types/listing';
import { bookingCode } from '@/lib/booking-code';

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const { data: invoice, isLoading, error } = useInvoice(id);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#f6fbfe' }}>
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#2a7bd9] border-t-transparent" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4" style={{ background: '#f6fbfe' }}>
        <p className="text-sm" style={{ color: '#5a6b85' }}>Không tìm thấy hóa đơn.</p>
        <Link href={`/bookings/${id}`} className="text-xs font-medium" style={{ color: '#2a7bd9' }}>← Quay lại đơn thuê</Link>
      </div>
    );
  }

  const isPaid = invoice.payment.status === 'PAID';
  const paidDate = invoice.payment.paidAt
    ? new Date(invoice.payment.paidAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : new Date(invoice.issuedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const startDate = new Date(invoice.booking.startDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const endDate = new Date(invoice.booking.endDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const categoryLabel = CATEGORY_LABELS[invoice.listing.category as keyof typeof CATEGORY_LABELS] ?? invoice.listing.category;

  return (
    <div className="min-h-screen pt-20 print:pt-0" style={{ background: '#f6fbfe' }}>
      {/* Action bar — hidden on print */}
      <div className="print:hidden sticky top-20 z-10 border-b bg-white px-6 py-3" style={{ borderColor: '#DCEFFB' }}>
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href={`/bookings/${id}`} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#2a7bd9' }}>
            ← Quay lại đơn thuê
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white"
            style={{ background: '#2a7bd9' }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            In / Lưu PDF
          </button>
        </div>
      </div>

      {/* Invoice document */}
      <div className="mx-auto max-w-3xl px-6 pb-10 pt-24 sm:pt-28 print:p-0 print:max-w-none">
        <div className="rounded-2xl bg-white p-10 shadow-sm print:rounded-none print:shadow-none" style={{ border: '1px solid #DCEFFB' }}>

          {/* Header */}
          <div className="flex items-start justify-between border-b pb-6" style={{ borderColor: '#DCEFFB' }}>
            <div>
              <p className="text-2xl font-extrabold" style={{ color: '#0f1729' }}>FlexTrip</p>
              <p className="mt-0.5 text-xs" style={{ color: '#8694ad' }}>Nền tảng cho thuê thiết bị du lịch</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8694ad' }}>Hóa đơn</p>
              <p className="mt-1 text-xl font-bold" style={{ color: '#0f1729' }}>{invoice.invoiceNumber}</p>
              <p className="mt-0.5 text-xs" style={{ color: '#5a6b85' }}>Ngày: {paidDate}</p>
            </div>
          </div>

          {/* Billing info */}
          <div className="mt-6 grid grid-cols-2 gap-6">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: '#8694ad' }}>Khách thuê</p>
              <p className="font-semibold" style={{ color: '#0f1729' }}>{invoice.traveler.name}</p>
              <p className="text-sm" style={{ color: '#5a6b85' }}>{invoice.traveler.email}</p>
            </div>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: '#8694ad' }}>Người cho thuê</p>
              <p className="font-semibold" style={{ color: '#0f1729' }}>{invoice.provider.name}</p>
              <p className="text-sm" style={{ color: '#5a6b85' }}>{invoice.provider.email}</p>
            </div>
          </div>

          {/* Booking info */}
          <div className="mt-6 rounded-xl p-4" style={{ background: '#f6fbfe' }}>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider" style={{ color: '#8694ad' }}>Chi tiết đơn thuê</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: '#5a6b85' }}>Mã đơn</span>
                <span className="font-medium" style={{ color: '#0f1729' }}>{bookingCode(invoice.booking.id)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#5a6b85' }}>Danh mục</span>
                <span className="font-medium" style={{ color: '#0f1729' }}>{categoryLabel}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#5a6b85' }}>Ngày nhận</span>
                <span className="font-medium" style={{ color: '#0f1729' }}>{startDate}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#5a6b85' }}>Ngày trả</span>
                <span className="font-medium" style={{ color: '#0f1729' }}>{endDate}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#5a6b85' }}>Địa điểm</span>
                <span className="font-medium" style={{ color: '#0f1729' }}>{invoice.listing.location}</span>
              </div>
              {invoice.booking.deliveryMethod === 'DELIVERY' && invoice.booking.deliveryAddress && (
                <div className="col-span-2 flex justify-between">
                  <span style={{ color: '#5a6b85' }}>Địa chỉ giao</span>
                  <span className="font-medium text-right" style={{ color: '#0f1729' }}>{invoice.booking.deliveryAddress}</span>
                </div>
              )}
            </div>
          </div>

          {/* Line items */}
          <div className="mt-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: '#DCEFFB' }}>
                  <th className="pb-2 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#8694ad' }}>Dịch vụ</th>
                  <th className="pb-2 text-right text-xs font-bold uppercase tracking-wider" style={{ color: '#8694ad' }}>Đơn giá</th>
                  <th className="pb-2 text-right text-xs font-bold uppercase tracking-wider" style={{ color: '#8694ad' }}>Số ngày</th>
                  <th className="pb-2 text-right text-xs font-bold uppercase tracking-wider" style={{ color: '#8694ad' }}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b" style={{ borderColor: '#f6fbfe' }}>
                  <td className="py-3" style={{ color: '#0f1729' }}>
                    <p className="font-medium">{invoice.listing.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#8694ad' }}>
                      × {invoice.booking.quantity} thiết bị
                    </p>
                  </td>
                  <td className="py-3 text-right" style={{ color: '#5a6b85' }}>
                    {invoice.listing.unitPrice.toLocaleString('vi-VN')}₫
                  </td>
                  <td className="py-3 text-right" style={{ color: '#5a6b85' }}>
                    {invoice.booking.nights}
                  </td>
                  <td className="py-3 text-right font-semibold" style={{ color: '#0f1729' }}>
                    {invoice.payment.totalAmount.toLocaleString('vi-VN')}₫
                  </td>
                </tr>
                {invoice.payment.discountAmount > 0 && (
                  <tr className="border-b" style={{ borderColor: '#f6fbfe' }}>
                    <td className="py-3" style={{ color: '#0f1729' }}>
                      <p className="font-medium">Giảm giá (voucher)</p>
                    </td>
                    <td className="py-3 text-right" style={{ color: '#5a6b85' }}>—</td>
                    <td className="py-3 text-right" style={{ color: '#5a6b85' }}>—</td>
                    <td className="py-3 text-right font-semibold" style={{ color: '#15803d' }}>
                      -{invoice.payment.discountAmount.toLocaleString('vi-VN')}₫
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="pt-4 text-right text-base font-bold" style={{ color: '#0f1729' }}>Tổng cộng</td>
                  <td className="pt-4 text-right text-xl font-extrabold" style={{ color: '#2a7bd9' }}>
                    {(invoice.payment.totalAmount - invoice.payment.discountAmount).toLocaleString('vi-VN')}₫
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Payment status: số tiền thực đã trả, không phải tổng đơn */}
          <div className="mt-6 space-y-2 rounded-xl p-4 text-sm" style={{ background: isPaid ? '#f0fdf4' : '#fff7ed', border: `1px solid ${isPaid ? '#bbf7d0' : '#fed7aa'}` }}>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: isPaid ? '#15803d' : '#c2410c' }}>
              {!isPaid ? 'Chưa thanh toán' : invoice.payment.remainingAmount > 0 ? '✓ Đã đặt cọc' : '✓ Đã thanh toán đủ'}
            </p>
            {invoice.payment.depositPaid > 0 && (
              <div className="flex justify-between" style={{ color: '#5a6b85' }}>
                <span>Tiền cọc đã trả{invoice.payment.gateway ? ` (${invoice.payment.gateway})` : ''}</span>
                <span>{invoice.payment.depositPaid.toLocaleString('vi-VN')}₫</span>
              </div>
            )}
            {invoice.payment.balancePaid > 0 && (
              <div className="flex justify-between" style={{ color: '#5a6b85' }}>
                <span>Tiền thuê còn lại đã trả</span>
                <span>{invoice.payment.balancePaid.toLocaleString('vi-VN')}₫</span>
              </div>
            )}
            <div className="flex justify-between font-bold" style={{ color: '#15803d' }}>
              <span>Đã thanh toán</span>
              <span>{invoice.payment.paidAmount.toLocaleString('vi-VN')}₫</span>
            </div>
            <div className="flex justify-between text-base font-extrabold" style={{ color: invoice.payment.remainingAmount > 0 ? '#c2410c' : '#15803d' }}>
              <span>Còn lại</span>
              <span>{invoice.payment.remainingAmount.toLocaleString('vi-VN')}₫</span>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 border-t pt-6 text-center text-xs" style={{ borderColor: '#DCEFFB', color: '#8694ad' }}>
            <p>FlexTrip — Nền tảng cho thuê thiết bị du lịch</p>
            <p className="mt-1">Hóa đơn này được tạo tự động và có giá trị pháp lý.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
