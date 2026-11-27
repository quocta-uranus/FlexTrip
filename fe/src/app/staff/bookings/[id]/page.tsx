'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, ArrowLeft, CalendarDays, Camera, CheckCircle2,
  FileText, MapPin, Package, Phone, Scale, Truck, User2,
} from 'lucide-react';
import { StartChatButton } from '@/components/chat/start-chat-button';
import { ActionButton } from '@/components/staff/action-button';
import { ConditionDialog } from '@/components/staff/condition-dialog';
import { isBeforeRentalStart } from '@/lib/handover-date';
import { MediationFormDialog } from '@/components/staff/mediation-form-dialog';
import { MediationActionDialog } from '@/components/staff/mediation-action-dialog';
import { ContractViewer } from '@/components/contracts/ContractViewer';
import { ExportPdfButton } from '@/components/contracts/ExportPdfButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CONTRACT_STATUS_COLOR, CONTRACT_STATUS_LABEL, type ContractStatus } from '@/types/contract';
import { rentalDays } from '@/lib/rental-days';
import { useStaffBooking } from '@/hooks/use-staff-operations';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function formatDatetime(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
// Same palette as the admin booking list, so one status looks the same everywhere.
const STATUS_STYLE: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  PENDING_APPROVAL: { label: 'Chờ duyệt',   bg: '#fffbeb', text: '#92400e', dot: '#f59e0b' },
  CONFIRMED:        { label: 'Đã xác nhận', bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6' },
  IN_PROGRESS:      { label: 'Đang thuê',   bg: '#f0fdf4', text: '#15803d', dot: '#22c55e' },
  COMPLETED:        { label: 'Hoàn thành',  bg: '#f0fdfa', text: '#115e59', dot: '#14b8a6' },
  DISPUTED:         { label: 'Tranh chấp',  bg: '#faf5ff', text: '#6b21a8', dot: '#a855f7' },
  CANCELLED:        { label: 'Đã huỷ',      bg: '#fef2f2', text: '#991b1b', dot: '#ef4444' },
};

// The staff dialog stores the checklist as text ("Kiểm tra:\n✓ …\n\nGhi chú: …"); turn it back into chips.
function parseCondition(text?: string | null) {
  if (!text) return { items: [] as { label: string; ok: boolean }[], note: '' };
  const items = text
    .split('\n')
    .filter((line) => /^[✓✗]\s/.test(line))
    .map((line) => ({ ok: line.startsWith('✓'), label: line.slice(2).trim() }));
  const note = text.match(/Ghi chú:\s*([\s\S]*)$/)?.[1]?.trim() ?? (items.length === 0 ? text.trim() : '');
  return { items, note };
}

const photoUrl = (p: string | { url: string }) => (typeof p === 'string' ? p : p.url);

function ChecklistChips({ text }: { text?: string | null }) {
  const { items, note } = parseCondition(text);
  if (items.length === 0 && !note) return null;
  return (
    <div className="mt-2 space-y-1.5">
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((i) => (
            <span
              key={i.label}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${i.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
            >
              {i.ok ? '✓' : '✗'} {i.label}
            </span>
          ))}
        </div>
      )}
      {note && <p className="text-xs text-[#5a6b85]">Ghi chú: {note}</p>}
    </div>
  );
}

function Photos({ urls, alt }: { urls: string[]; alt: string }) {
  if (urls.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {urls.map((url, i) => (
        <a key={url} href={url} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={`${alt} ${i + 1}`} className="h-16 w-20 rounded-lg object-cover ring-1 ring-[#e2e8f3]" />
        </a>
      ))}
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2.5 text-xs text-[#8694ad]">
      <Camera className="h-4 w-4 shrink-0" />
      {children}
    </div>
  );
}

// One stage of the rental (handover or return). Both stages sit side by side so an order with no photos yet still fills the row.
function StagePanel({ step, done, title, caption, children }: {
  step: number; done: boolean; title: string; caption?: string; children?: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl p-4 ${done ? 'bg-[#f8fafc]' : 'border border-dashed border-slate-200 bg-[#f8fafc]/60'}`}>
      <div className="flex items-center gap-3">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-teal-500 text-white' : 'border border-dashed border-slate-300 bg-white text-slate-400'}`}
        >
          {done ? <CheckCircle2 className="h-4 w-4" /> : step}
        </span>
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${done ? 'text-[#0f1729]' : 'text-[#8694ad]'}`}>{title}</p>
          {caption && <p className="text-xs text-[#8694ad]">{caption}</p>}
        </div>
      </div>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: booking, isLoading, isError, refetch } = useStaffBooking(id);

  const [conditionDialog, setConditionDialog] = useState<'HANDOVER' | 'RETURN' | null>(null);
  const [mediationDialog, setMediationDialog] = useState(false);
  const [actionState, setActionState] = useState<{ mediationId: string; action: 'resolve' | 'escalate'; issue: string } | null>(null);
  const [notice, setNotice] = useState('');

  if (isLoading) return (
    <div className="mx-auto max-w-4xl space-y-4 px-6 pb-8 pt-24 sm:pt-28">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );

  if (isError || !booking) return (
    <div className="mx-auto max-w-4xl px-6 pb-8 pt-24 sm:pt-28">
      <Button variant="outline" onClick={() => router.back()} className="mb-4"><ArrowLeft className="h-4 w-4" />Quay lại</Button>
      <p className="rounded-xl bg-red-50 p-4 text-red-700">Không tìm thấy booking hoặc bạn không có quyền xem.</p>
    </div>
  );

  const canHandover = booking.status === 'CONFIRMED' && !booking.checkedInAt;
  const canReturn = (booking.status === 'IN_PROGRESS' || booking.status === 'DISPUTED') && booking.checkedInAt && !booking.checkedOutAt;
  const tooEarly = Boolean(canHandover) && isBeforeRentalStart(booking.startDate);
  const canMediate = booking.status === 'CONFIRMED' || booking.status === 'IN_PROGRESS';
  const hasNextStep = Boolean(canHandover || canReturn);
  const statusCfg = STATUS_STYLE[booking.status] ?? { label: booking.status, bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' };
  const contractStatus = booking.contract ? (booking.contract.status as ContractStatus) : null;
  const contractColor = contractStatus ? CONTRACT_STATUS_COLOR[contractStatus] : null;
  const checkOutUrls = (booking.contract?.checkOutPhotos ?? []).map(photoUrl);
  const handoverUrls = booking.contract?.checkInPhotos ?? [];
  const hasHandoverRecord = parseCondition(booking.handoverCondition).items.length > 0 || !!parseCondition(booking.handoverCondition).note || handoverUrls.length > 0;
  const hasReturnRecord = parseCondition(booking.returnCondition).items.length > 0 || !!parseCondition(booking.returnCondition).note || checkOutUrls.length > 0;
  const openMediations = booking.staffMediations?.filter((m: { status: string }) => m.status === 'OPEN') ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 pb-8 pt-24 sm:pt-28">
      {/* Back + notice */}
      <Button variant="ghost" onClick={() => router.push('/staff/bookings')} className="-ml-2 text-[#5a6b85] hover:text-[#0f1729]">
        <ArrowLeft className="h-4 w-4" />Booking của tôi
      </Button>

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-5 w-5 shrink-0" />{notice}
        </div>
      )}

      {/* Header card */}
      <Card className="border-0 shadow-sm ring-1 ring-[#e2e8f3]">
        <CardContent className="p-0">
          <div className="h-1.5 rounded-t-xl" style={{ background: statusCfg.dot }} />
          <div className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#f1f5fa]">
                  {booking.listing.imageUrls?.[0]
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={booking.listing.imageUrls[0]} alt="" className="h-full w-full object-cover" />
                    : <div className="flex h-full items-center justify-center text-2xl">⛺</div>}
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-xl font-bold text-[#0f1729]">{booking.listing.title}</h1>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-[#5a6b85]">
                    <MapPin className="h-4 w-4 shrink-0 text-[#8694ad]" />
                    <span className="truncate">{booking.listing.location}</span>
                    <span className="font-mono text-xs text-[#8694ad]">· #{id.slice(0, 12)}</span>
                  </p>
                </div>
              </div>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                style={{ background: statusCfg.bg, color: statusCfg.text }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusCfg.dot }} />
                {statusCfg.label}
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-[#f8fafc] px-3.5 py-2.5">
                <p className="mb-0.5 flex items-center gap-1.5 text-xs text-[#8694ad]"><CalendarDays className="h-3.5 w-3.5" />Ngày thuê</p>
                <p className="text-sm font-semibold text-[#0f1729]">{formatDate(booking.startDate)} → {formatDate(booking.endDate)}</p>
              </div>
              <div className="rounded-xl bg-[#f8fafc] px-3.5 py-2.5">
                <p className="mb-0.5 flex items-center gap-1.5 text-xs text-[#8694ad]">
                  {booking.deliveryMethod === 'DELIVERY' ? <Truck className="h-3.5 w-3.5" /> : <Package className="h-3.5 w-3.5" />}Hình thức
                </p>
                <p className="truncate text-sm font-semibold text-[#0f1729]">
                  {booking.deliveryMethod === 'DELIVERY' ? `Giao hàng — ${booking.deliveryAddress ?? '—'}` : 'Nhận trực tiếp'}
                </p>
              </div>
              <div className="rounded-xl bg-[#f8fafc] px-3.5 py-2.5">
                <p className="mb-0.5 text-xs text-[#8694ad]">Thời gian thuê</p>
                <p className="text-sm font-semibold text-[#0f1729]">{rentalDays(booking.startDate, booking.endDate)} ngày</p>
              </div>
            </div>

            {canMediate && !hasNextStep && (
              <div className="mt-5 flex flex-wrap gap-2 border-t border-[#f1f5fa] pt-4">
                <ActionButton variant="warn" onClick={() => setMediationDialog(true)}>
                  <Scale className="h-[18px] w-[18px]" />Lập biên bản thương lượng
                </ActionButton>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Handover and return, side by side */}
      <Card className="border-0 shadow-sm ring-1 ring-[#e2e8f3]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-[#5a6b85]">
            <Package className="h-4 w-4" />GIAO NHẬN
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasNextStep && (
            <div
              className={`mb-4 flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between ${
                canReturn ? 'border-emerald-200 bg-emerald-50/60' : 'border-blue-200 bg-blue-50/60'
              }`}
            >
              <div>
                <p className={`text-[11px] font-bold uppercase tracking-widest ${canReturn ? 'text-emerald-700' : 'text-[#1e5aa8]'}`}>
                  Việc cần làm tiếp theo
                </p>
                <p className="mt-1 text-sm text-[#0f1729]">
                  {canReturn ? (
                    <>Nhận lại thiết bị từ khách vào <b>{formatDate(booking.endDate)}</b>. Kiểm tra ngoại quan, phụ kiện và chụp ảnh tình trạng.</>
                  ) : (
                    tooEarly ? (
                    <>Chưa tới ngày thuê. Có thể bàn giao từ <b>{formatDate(booking.startDate)}</b>.</>
                  ) : (
                    <>Giao thiết bị cho khách vào <b>{formatDate(booking.startDate)}</b>. Đối chiếu phụ kiện và chụp ảnh trước khi bàn giao.</>
                  )
                  )}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                {canMediate && (
                  <ActionButton variant="warn" onClick={() => setMediationDialog(true)}>
                    <Scale className="h-[18px] w-[18px]" />Lập biên bản thương lượng
                  </ActionButton>
                )}
                {canReturn ? (
                  <ActionButton variant="primary-emerald" onClick={() => setConditionDialog('RETURN')}>
                    <Camera className="h-[18px] w-[18px]" />Kiểm tra & hoàn thành thuê
                  </ActionButton>
                ) : (
                  <ActionButton variant="primary-blue" disabled={tooEarly} onClick={() => setConditionDialog('HANDOVER')}>
                    <Camera className="h-[18px] w-[18px]" />Giao thiết bị & bắt đầu thuê
                  </ActionButton>
                )}
              </div>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <StagePanel
              step={1}
              done={!!booking.checkedInAt}
              title={booking.checkedInAt ? 'Đã bàn giao' : 'Chưa bàn giao'}
              caption={booking.checkedInAt ? formatDatetime(booking.checkedInAt) : `Ngày nhận: ${formatDate(booking.startDate)}`}
            >
              {booking.checkedInAt ? (
                <>
                  <ChecklistChips text={booking.handoverCondition} />
                  <Photos urls={handoverUrls} alt="Ảnh bàn giao" />
                  {!hasHandoverRecord && <EmptyHint>Chưa có ảnh hoặc ghi chú kiểm tra</EmptyHint>}
                </>
              ) : (
                <>
                  <EmptyHint>Chưa có biên bản bàn giao</EmptyHint>
                </>
              )}
            </StagePanel>

            <StagePanel
              step={2}
              done={!!booking.checkedOutAt}
              title={booking.checkedOutAt ? 'Đã nhận lại' : 'Chưa nhận lại'}
              caption={booking.checkedOutAt ? formatDatetime(booking.checkedOutAt) : `Hạn trả: ${formatDate(booking.endDate)}`}
            >
              {booking.checkedOutAt ? (
                <>
                  <ChecklistChips text={booking.returnCondition} />
                  <Photos urls={checkOutUrls} alt="Ảnh nhận lại" />
                  {!hasReturnRecord && <EmptyHint>Chưa có ảnh hoặc ghi chú kiểm tra</EmptyHint>}
                </>
              ) : (
                <>
                  <EmptyHint>{booking.checkedInAt ? 'Chưa có biên bản nhận lại' : 'Cần bàn giao trước khi nhận lại'}</EmptyHint>
                </>
              )}
            </StagePanel>
          </div>
        </CardContent>
      </Card>

      {/* Contract: always shown, so a missing one is visible instead of silently absent */}
      {booking.contract ? (
        <Card className="border-0 shadow-sm ring-1 ring-[#e2e8f3]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between gap-2 text-sm font-bold text-[#5a6b85]">
              <span className="flex items-center gap-2"><FileText className="h-4 w-4" />HỢP ĐỒNG</span>
              {contractColor && contractStatus && (
                <span
                  className="rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                  style={{ background: contractColor.bg, color: contractColor.text, borderColor: contractColor.border }}
                >
                  {CONTRACT_STATUS_LABEL[contractStatus] ?? contractStatus}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className={`rounded-full px-3 py-1 font-medium ${booking.contract.travelerSignedAt ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                Traveler: {booking.contract.travelerSignedAt ? `✓ đã ký ${formatDatetime(booking.contract.travelerSignedAt)}` : '⏳ chưa ký'}
              </span>
              <span className={`rounded-full px-3 py-1 font-medium ${booking.contract.providerSignedAt ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                Provider: {booking.contract.providerSignedAt ? `✓ đã ký ${formatDatetime(booking.contract.providerSignedAt)}` : '⏳ chưa ký'}
              </span>
            </div>
            <ContractViewer
              terms={booking.contract.terms}
              penaltyRules={booking.contract.penaltyRules ?? undefined}
              conditionNote={booking.contract.productConditionNote}
              actions={<ExportPdfButton contract={{ ...booking.contract, bookingId: booking.id }} travelerName={booking.traveler.name} providerName={booking.listing.provider.name} />}
              content={booking.contract.content}
              appendices={booking.contract.appendices}
              travelerSignature={booking.contract.travelerSignature}
              providerSignature={booking.contract.providerSignature}
              collapsible
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm ring-1 ring-[#e2e8f3]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between gap-2 text-sm font-bold text-[#5a6b85]">
              <span className="flex items-center gap-2"><FileText className="h-4 w-4" />HỢP ĐỒNG</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">Chưa có</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed border-slate-300 bg-[#f8fafc] px-3 py-3 text-xs text-[#8694ad]">
              Đơn này chưa có hợp đồng ký điện tử. Hợp đồng sẽ hiện ở đây khi hai bên ký.
            </div>
          </CardContent>
        </Card>
      )}

      {/* The two parties and the mediations: three equal cards */}
      <div className="grid items-start gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-0 shadow-sm ring-1 ring-[#e2e8f3]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-[#5a6b85]">
              <User2 className="h-4 w-4" />TRAVELER
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-semibold text-[#0f1729]">{booking.traveler.name}</p>
            {booking.traveler.phone && (
              <p className="flex items-center gap-1.5 text-sm text-[#5a6b85]"><Phone className="h-3.5 w-3.5" />{booking.traveler.phone}</p>
            )}
            <p className="truncate text-sm text-[#8694ad]">{booking.traveler.email}</p>
            <StartChatButton targetUserId={booking.traveler.id} label="Nhắn Traveler" />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm ring-1 ring-[#e2e8f3]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-[#5a6b85]">
              <User2 className="h-4 w-4" />PROVIDER
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-semibold text-[#0f1729]">{booking.listing.provider.name}</p>
            {booking.listing.provider.phone && (
              <p className="flex items-center gap-1.5 text-sm text-[#5a6b85]"><Phone className="h-3.5 w-3.5" />{booking.listing.provider.phone}</p>
            )}
            <p className="truncate text-sm text-[#8694ad]">{booking.listing.provider.email}</p>
            <StartChatButton targetUserId={booking.listing.provider.id} label="Nhắn Provider" />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm ring-1 ring-[#e2e8f3] md:col-span-2 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-[#5a6b85]">
              <Scale className="h-4 w-4" />BIÊN BẢN THƯƠNG LƯỢNG
              {openMediations.length > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">{openMediations.length} đang mở</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {booking.staffMediations?.length === 0 && (
              <p className="text-sm text-[#8694ad]">Chưa có biên bản thương lượng.</p>
            )}
            <div className="space-y-3">
              {booking.staffMediations?.map((m: { id: string; status: string; issue: string; resolution: string | null; createdAt: string }) => (
                <div key={m.id} className="rounded-xl border border-[#e2e8f3] bg-[#f8fafc] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <span className={`mb-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        m.status === 'OPEN' ? 'bg-amber-100 text-amber-700' :
                        m.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {m.status === 'OPEN' ? 'Đang thương lượng' : m.status === 'RESOLVED' ? 'Đã thoả thuận' : 'Đã chuyển Admin'}
                      </span>
                      <p className="text-sm font-medium text-[#0f1729]">{m.issue}</p>
                      {m.resolution && <p className="mt-1 text-xs text-[#5a6b85]">Kết quả: {m.resolution}</p>}
                      <p className="mt-1 text-[10px] text-[#8694ad]">{formatDatetime(m.createdAt)}</p>
                    </div>
                    {m.status === 'OPEN' && (
                      <div className="flex shrink-0 flex-col gap-1.5">
                        <ActionButton variant="success" size="sm"
                          onClick={() => setActionState({ mediationId: m.id, action: 'resolve', issue: m.issue })}>
                          <CheckCircle2 className="h-4 w-4" />Thoả thuận
                        </ActionButton>
                        <ActionButton variant="primary-red" size="sm"
                          onClick={() => setActionState({ mediationId: m.id, action: 'escalate', issue: m.issue })}>
                          <AlertTriangle className="h-4 w-4" />Chuyển Admin
                        </ActionButton>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <ConditionDialog
        open={!!conditionDialog}
        type={conditionDialog ?? 'HANDOVER'}
        providerCondition={booking.contract?.productConditionNote}
        context={{
          title: booking.listing.title,
          caption: conditionDialog === 'RETURN'
            ? `Traveler: ${booking.traveler.name} · Hạn trả ${formatDate(booking.endDate)}`
            : `Traveler: ${booking.traveler.name} · Ngày nhận ${formatDate(booking.startDate)}`,
        }}
        bookingId={id}
        onClose={() => setConditionDialog(null)}
        onDone={(msg) => { setConditionDialog(null); setNotice(msg); refetch(); }}
        onReportIssue={() => setMediationDialog(true)}
      />
      <MediationFormDialog
        open={mediationDialog}
        bookingId={id}
        context={{ title: booking.listing.title, caption: `${statusCfg.label} · ${formatDate(booking.startDate)} – ${formatDate(booking.endDate)}` }}
        onClose={() => setMediationDialog(false)}
        onDone={(msg) => { setNotice(msg); refetch(); }}
      />
      <MediationActionDialog
        mediationId={actionState?.mediationId ?? null}
        action={actionState?.action ?? 'resolve'}
        issue={actionState?.issue ?? ''}
        onClose={() => setActionState(null)}
        onDone={(msg) => { setActionState(null); setNotice(msg); refetch(); }}
      />
    </div>
  );
}
