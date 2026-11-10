'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle, ArrowLeft, CalendarDays, Camera, CheckCircle2,
  FileText, MapPin, Package, Phone, Scale, Truck, Upload, User2,
} from 'lucide-react';
import { ContractViewer } from '@/components/contracts/ContractViewer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  useConfirmStaffTask, useCreateMediation, useEscalateMediation,
  useResolveMediation, useStaffBooking,
} from '@/hooks/use-staff-operations';
import {
  staffConditionSchema, staffEscalationSchema, staffMediationSchema, staffResolutionSchema,
  type StaffConditionInput, type StaffEscalationInput, type StaffMediationInput, type StaffResolutionInput,
} from '@/lib/validators/staff.schema';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function formatDatetime(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function errMsg(e: unknown) {
  return e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string'
    ? (e as { message: string }).message
    : 'Không thể thực hiện. Vui lòng thử lại.';
}

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  CONFIRMED:   { label: 'Đã xác nhận', variant: 'outline' },
  IN_PROGRESS: { label: 'Đang thuê',   variant: 'default' },
  COMPLETED:   { label: 'Hoàn thành',  variant: 'secondary' },
  DISPUTED:    { label: 'Tranh chấp',  variant: 'destructive' },
};

const INSPECTION_ITEMS = {
  HANDOVER: ['Đúng thiết bị trong đơn thuê', 'Đầy đủ phụ kiện đi kèm', 'Hoạt động bình thường'],
  RETURN: ['Ngoại quan nguyên vẹn, không hư hỏng mới', 'Đầy đủ phụ kiện đi kèm', 'Hoạt động bình thường', 'Đã vệ sinh sạch sẽ'],
} as const;

// ── Condition dialog (handover/return) ──────────────────────────────────────
function ConditionDialog({ open, type, bookingId, onClose, onDone, onReportIssue }: {
  open: boolean; type: 'HANDOVER' | 'RETURN'; bookingId: string;
  onClose: () => void; onDone: (msg: string) => void; onReportIssue: () => void;
}) {
  const mutation = useConfirmStaffTask();
  const form = useForm<StaffConditionInput>({ resolver: zodResolver(staffConditionSchema) });
  const items = INSPECTION_ITEMS[type];
  const [checked, setChecked] = useState<boolean[]>([]);
  const ticks = items.map((_, i) => checked[i] ?? false);
  // Return completes the rental and releases money, so every item must pass; handover only records the state
  const mustPass = type === 'RETURN';
  const failed = items.filter((_, i) => !ticks[i]);
  const blocked = mustPass && failed.length > 0;

  const submit = form.handleSubmit((v) => {
    mutation.mutate(
      {
        bookingId, type, conditionNote: v.conditionNote, file: v.file,
        checklist: items.map((label, i) => ({ label, ok: ticks[i] })),
      },
      { onSuccess: () => { form.reset(); setChecked([]); onClose(); onDone(type === 'HANDOVER' ? 'Đã xác nhận bàn giao. Cuộc thuê đã bắt đầu.' : 'Đã kiểm tra và nhận lại. Cuộc thuê đã hoàn thành.'); } },
    );
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{type === 'HANDOVER' ? 'Xác nhận giao thiết bị' : 'Xác nhận nhận lại thiết bị'}</DialogTitle>
          <DialogDescription>Ảnh và mô tả sẽ được lưu vào biên bản để đối chiếu khi có tranh chấp.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>{type === 'RETURN' ? 'Kiểm tra thiết bị khi nhận lại' : 'Kiểm tra thiết bị khi bàn giao'}</Label>
            <div className="space-y-1.5 rounded-xl border border-slate-200 p-3">
              {items.map((label, i) => (
                <label key={label} className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-emerald-600"
                    checked={ticks[i]}
                    onChange={(e) => setChecked(ticks.map((t, j) => (j === i ? e.target.checked : t)))}
                  />
                  {label}
                </label>
              ))}
            </div>
            {blocked && (
              <div className="flex items-start justify-between gap-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                <span>Chưa thể hoàn thành vì còn hạng mục chưa đạt. Nếu phát hiện vấn đề, hãy lập biên bản thương lượng.</span>
                <button type="button" onClick={() => { onClose(); onReportIssue(); }} className="shrink-0 font-semibold underline">
                  Lập biên bản
                </button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>Ảnh tình trạng</Label>
            <Input type="file" accept="image/*" capture="environment"
              onChange={(e) => form.setValue('file', e.target.files?.[0] as File, { shouldValidate: true })} />
            {form.formState.errors.file && <p className="text-xs text-red-600">{form.formState.errors.file.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Tình trạng thiết bị</Label>
            <Textarea rows={4} placeholder="Mô tả ngoại quan, phụ kiện, vết xước..." {...form.register('conditionNote')} />
            {form.formState.errors.conditionNote && <p className="text-xs text-red-600">{form.formState.errors.conditionNote.message}</p>}
          </div>
          {mutation.isError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errMsg(mutation.error)}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Huỷ</Button>
            <Button type="submit" disabled={mutation.isPending || blocked}>
              <Upload className="h-4 w-4" />
              {mutation.isPending ? 'Đang lưu...' : type === 'HANDOVER' ? 'Xác nhận & bắt đầu thuê' : 'Xác nhận & hoàn thành'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Mediation dialog ──────────────────────────────────────────────────────
function MediationDialog({ open, bookingId, onClose, onDone }: {
  open: boolean; bookingId: string; onClose: () => void; onDone: () => void;
}) {
  const mutation = useCreateMediation();
  const form = useForm<StaffMediationInput>({
    resolver: zodResolver(staffMediationSchema),
    defaultValues: { files: [], issue: '', travelerStatement: '', providerStatement: '' },
  });
  const submit = form.handleSubmit((v) => {
    mutation.mutate({ bookingId, ...v }, { onSuccess: () => { form.reset(); onClose(); onDone(); } });
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Biên bản thương lượng tại chỗ</DialogTitle>
          <DialogDescription>Ghi nhận trung lập ý kiến hai bên và bằng chứng.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2"><Label>Vấn đề phát sinh</Label><Textarea rows={3} {...form.register('issue')} />{form.formState.errors.issue && <p className="text-xs text-red-600">{form.formState.errors.issue.message}</p>}</div>
          <div className="space-y-2"><Label>Ý kiến Traveler</Label><Textarea rows={2} {...form.register('travelerStatement')} /></div>
          <div className="space-y-2"><Label>Ý kiến Provider</Label><Textarea rows={2} {...form.register('providerStatement')} /></div>
          <div className="space-y-2"><Label>Ảnh bằng chứng (tối đa 10)</Label><Input type="file" accept="image/*" multiple onChange={(e) => form.setValue('files', Array.from(e.target.files ?? []))} /></div>
          {mutation.isError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errMsg(mutation.error)}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Huỷ</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Đang lập...' : 'Lập biên bản'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Resolve/Escalate dialog ───────────────────────────────────────────────
function MediationActionDialog({ mediationId, action, issue, onClose, onDone }: {
  mediationId: string | null; action: 'resolve' | 'escalate'; issue: string;
  onClose: () => void; onDone: () => void;
}) {
  const resolve = useResolveMediation();
  const escalate = useEscalateMediation();
  const resolveForm = useForm<StaffResolutionInput>({ resolver: zodResolver(staffResolutionSchema) });
  const escalateForm = useForm<StaffEscalationInput>({ resolver: zodResolver(staffEscalationSchema), defaultValues: { type: 'DAMAGE_CLAIM', priority: 'HIGH' } });

  const submitResolve = resolveForm.handleSubmit((v) => {
    if (!mediationId) return;
    resolve.mutate({ id: mediationId, resolution: v.resolution }, { onSuccess: () => { resolveForm.reset(); onClose(); onDone(); } });
  });
  const submitEscalate = escalateForm.handleSubmit((v) => {
    if (!mediationId) return;
    escalate.mutate({ id: mediationId, type: v.type, priority: v.priority, requestedAmount: v.requestedAmount ? Number(v.requestedAmount) : undefined, additionalNotes: v.additionalNotes },
      { onSuccess: () => { escalateForm.reset(); onClose(); onDone(); } });
  });

  return (
    <Dialog open={!!mediationId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{action === 'resolve' ? 'Ghi nhận thoả thuận' : 'Chuyển vụ việc lên Admin'}</DialogTitle>
          <DialogDescription className="line-clamp-2">{issue}</DialogDescription>
        </DialogHeader>
        {action === 'resolve' ? (
          <form onSubmit={submitResolve} className="space-y-4">
            <div className="space-y-2"><Label>Nội dung hai bên đã thống nhất</Label><Textarea rows={4} {...resolveForm.register('resolution')} />{resolveForm.formState.errors.resolution && <p className="text-xs text-red-600">{resolveForm.formState.errors.resolution.message}</p>}</div>
            <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Huỷ</Button><Button type="submit" disabled={resolve.isPending}>Hoàn tất thương lượng</Button></DialogFooter>
          </form>
        ) : (
          <form onSubmit={submitEscalate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Loại tranh chấp</Label><select className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" {...escalateForm.register('type')}><option value="DAMAGE_CLAIM">Hư hỏng</option><option value="REFUND_REQUEST">Hoàn tiền</option><option value="PAYMENT_DISPUTE">Thanh toán</option><option value="CANCELLATION_DISPUTE">Huỷ booking</option></select></div>
              <div className="space-y-2"><Label>Mức ưu tiên</Label><select className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" {...escalateForm.register('priority')}><option value="MEDIUM">Trung bình</option><option value="HIGH">Cao</option><option value="CRITICAL">Khẩn cấp</option></select></div>
            </div>
            <div className="space-y-2"><Label>Số tiền yêu cầu (nếu có)</Label><Input type="number" min="0" {...escalateForm.register('requestedAmount')} /></div>
            <div className="space-y-2"><Label>Ghi chú</Label><Textarea rows={3} {...escalateForm.register('additionalNotes')} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Huỷ</Button><Button type="submit" variant="destructive" disabled={escalate.isPending}><AlertTriangle className="h-4 w-4" />Chuyển Admin</Button></DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
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
    <div className="mx-auto max-w-4xl space-y-4 px-6 py-8">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );

  if (isError || !booking) return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Button variant="outline" onClick={() => router.back()} className="mb-4"><ArrowLeft className="h-4 w-4" />Quay lại</Button>
      <p className="rounded-xl bg-red-50 p-4 text-red-700">Không tìm thấy booking hoặc bạn không có quyền xem.</p>
    </div>
  );

  const now = new Date();
  const startDate = new Date(booking.startDate);
  const endDate = new Date(booking.endDate);
  const canHandover = booking.status === 'CONFIRMED' && !booking.checkedInAt;
  const canReturn = (booking.status === 'IN_PROGRESS' || booking.status === 'DISPUTED') && booking.checkedInAt && !booking.checkedOutAt;
  const canMediate = booking.status === 'CONFIRMED' || booking.status === 'IN_PROGRESS';
  const statusCfg = STATUS_MAP[booking.status] ?? { label: booking.status, variant: 'outline' as const };
  const openMediations = booking.staffMediations?.filter((m: { status: string }) => m.status === 'OPEN') ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
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
          <div className={`h-1.5 rounded-t-xl ${
            booking.status === 'IN_PROGRESS' ? 'bg-gradient-to-r from-emerald-400 to-teal-400' :
            booking.status === 'DISPUTED' ? 'bg-red-400' :
            booking.status === 'COMPLETED' ? 'bg-slate-300' : 'bg-blue-400'
          }`} />
          <div className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-[#0f1729]">{booking.listing.title}</h1>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-[#5a6b85]">
                  <MapPin className="h-4 w-4 text-[#8694ad]" />
                  {booking.listing.location}
                </p>
                <p className="mt-1 font-mono text-xs text-[#8694ad]">#{id.slice(0, 12)}</p>
              </div>
              <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
            </div>

            <div className="mt-4 flex flex-wrap gap-6 text-sm text-[#5a6b85]">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[#8694ad]" />
                <span>{formatDate(booking.startDate)} → {formatDate(booking.endDate)}</span>
              </div>
              <div className="flex items-center gap-2">
                {booking.deliveryMethod === 'DELIVERY' ? <Truck className="h-4 w-4 text-[#8694ad]" /> : <Package className="h-4 w-4 text-[#8694ad]" />}
                <span>{booking.deliveryMethod === 'DELIVERY' ? `Giao hàng — ${booking.deliveryAddress ?? '—'}` : 'Nhận trực tiếp'}</span>
              </div>
            </div>

            {/* Action buttons */}
            {(canHandover || canReturn || canMediate) && (
              <div className="mt-5 flex flex-wrap gap-2 border-t border-[#f1f5fa] pt-4">
                {canHandover && (
                  <Button onClick={() => setConditionDialog('HANDOVER')} className="bg-[#2a7bd9] hover:bg-[#1e5aa8]">
                    <Camera className="h-4 w-4" />Giao thiết bị & bắt đầu thuê
                  </Button>
                )}
                {canReturn && (
                  <Button onClick={() => setConditionDialog('RETURN')} className="bg-emerald-600 hover:bg-emerald-700">
                    <Camera className="h-4 w-4" />Kiểm tra & hoàn thành thuê
                  </Button>
                )}
                {canMediate && (
                  <Button variant="outline" onClick={() => setMediationDialog(true)}>
                    <Scale className="h-4 w-4" />Lập biên bản thương lượng
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Traveler */}
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
            <p className="text-sm text-[#8694ad]">{booking.traveler.email}</p>
          </CardContent>
        </Card>

        {/* Provider */}
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
          </CardContent>
        </Card>
      </div>

      {/* Contract */}
      {booking.contract && (
        <Card className="border-0 shadow-sm ring-1 ring-[#e2e8f3]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-[#5a6b85]">
              <FileText className="h-4 w-4" />HỢP ĐỒNG
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#8694ad]">Trạng thái:</span>
              <span className="rounded-full bg-[#f1f5fa] px-2.5 py-0.5 text-xs font-semibold text-[#5a6b85]">{booking.contract.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <p className="rounded-lg bg-[#f8fafc] px-3 py-2 text-[#5a6b85]">
                Traveler: {booking.contract.travelerSignedAt ? `✓ đã ký ${formatDatetime(booking.contract.travelerSignedAt)}` : '⏳ chưa ký'}
              </p>
              <p className="rounded-lg bg-[#f8fafc] px-3 py-2 text-[#5a6b85]">
                Provider: {booking.contract.providerSignedAt ? `✓ đã ký ${formatDatetime(booking.contract.providerSignedAt)}` : '⏳ chưa ký'}
              </p>
            </div>
            <ContractViewer
              terms={booking.contract.terms}
              penaltyRules={booking.contract.penaltyRules ?? undefined}
              conditionNote={booking.contract.productConditionNote}
              collapsible
            />
            {booking.checkedInAt && (
              <p className="text-sm text-[#5a6b85]">Bàn giao lúc: <span className="font-medium text-[#0f1729]">{formatDatetime(booking.checkedInAt)}</span></p>
            )}
            {booking.checkedOutAt && (
              <p className="text-sm text-[#5a6b85]">Nhận lại lúc: <span className="font-medium text-[#0f1729]">{formatDatetime(booking.checkedOutAt)}</span></p>
            )}
            {booking.contract.checkInPhotos?.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold text-[#8694ad]">Ảnh bàn giao ({booking.contract.checkInPhotos.length})</p>
                <div className="flex flex-wrap gap-2">
                  {booking.contract.checkInPhotos.map((url: string, i: number) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer">
                      <img src={url} alt={`check-in-${i}`} className="h-16 w-16 rounded-lg object-cover ring-1 ring-[#e2e8f3]" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mediations */}
      <Card className="border-0 shadow-sm ring-1 ring-[#e2e8f3]">
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
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => setActionState({ mediationId: m.id, action: 'resolve', issue: m.issue })}>
                        <CheckCircle2 className="h-3 w-3" />Thoả thuận
                      </Button>
                      <Button size="sm" variant="destructive" className="h-7 text-xs"
                        onClick={() => setActionState({ mediationId: m.id, action: 'escalate', issue: m.issue })}>
                        <AlertTriangle className="h-3 w-3" />Chuyển Admin
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ConditionDialog
        open={!!conditionDialog}
        type={conditionDialog ?? 'HANDOVER'}
        bookingId={id}
        onClose={() => setConditionDialog(null)}
        onDone={(msg) => { setConditionDialog(null); setNotice(msg); refetch(); }}
        onReportIssue={() => setMediationDialog(true)}
      />
      <MediationDialog
        open={mediationDialog}
        bookingId={id}
        onClose={() => setMediationDialog(false)}
        onDone={() => { setMediationDialog(false); setNotice('Đã lập biên bản thương lượng.'); refetch(); }}
      />
      <MediationActionDialog
        mediationId={actionState?.mediationId ?? null}
        action={actionState?.action ?? 'resolve'}
        issue={actionState?.issue ?? ''}
        onClose={() => setActionState(null)}
        onDone={() => { setActionState(null); refetch(); }}
      />
    </div>
  );
}
