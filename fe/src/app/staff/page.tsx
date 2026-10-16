'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle, ArrowRight, CalendarDays, Camera, CheckCircle2,
  ClipboardList, Clock3, Lock, MapPin, Package, RotateCcw, Scale, TrendingUp, Upload, Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useRequestPayout, useWallet, useWalletTransactions } from '@/hooks/usePayments';
import {
  useConfirmStaffTask, useCreateMediation, useEscalateMediation,
  useMyBookings, useResolveMediation, useStaffMediations, useStaffTasks,
} from '@/hooks/use-staff-operations';
import {
  staffConditionSchema, staffEscalationSchema, staffMediationSchema, staffResolutionSchema,
  type StaffConditionInput, type StaffEscalationInput, type StaffMediationInput, type StaffResolutionInput,
} from '@/lib/validators/staff.schema';
import type { StaffBooking, StaffMediation, StaffTask } from '@/types/staff';

function localDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}
function errMsg(e: unknown) {
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string')
    return (e as { message: string }).message;
  return 'Không thể thực hiện. Vui lòng thử lại.';
}

// ── Task card ────────────────────────────────────────────────────────────
function TaskCard({ task, onConfirm, onMediate }: {
  task: StaffTask; onConfirm: (t: StaffTask) => void; onMediate: (t: StaffTask) => void;
}) {
  const isHandover = task.type === 'HANDOVER';
  const completed = Boolean(task.completedAt);
  return (
    <Card className="border-0 bg-white shadow-sm ring-1 ring-[#e2e8f3]">
      <CardHeader className="border-b border-[#f1f5fa]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`rounded-xl p-2.5 ${isHandover ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {isHandover ? <Package className="h-5 w-5" /> : <RotateCcw className="h-5 w-5" />}
            </div>
            <div>
              <CardTitle className="text-base">{isHandover ? 'Giao thiết bị' : 'Nhận lại thiết bị'}</CardTitle>
              <CardDescription className="mt-0.5 font-mono">#{task.bookingId.slice(0, 10)}</CardDescription>
            </div>
          </div>
          <Badge variant={completed ? 'secondary' : 'outline'}>
            {completed ? 'Đã hoàn thành' : 'Chờ xử lý'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div>
          <p className="font-semibold text-[#0f1729]">{task.listing.title}</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-[#5a6b85]">
            <MapPin className="h-4 w-4 text-[#8694ad]" />
            {task.deliveryAddress ?? task.listing.location}
          </p>
        </div>
        <div className="grid gap-3 rounded-xl bg-[#f8fafc] p-3 text-sm sm:grid-cols-2">
          <div><p className="text-[#8694ad]">Traveler</p><p className="font-medium text-[#0f1729]">{task.traveler.name}</p><p className="text-xs text-[#8694ad]">{task.traveler.phone ?? task.traveler.email}</p></div>
          <div><p className="text-[#8694ad]">Provider</p><p className="font-medium text-[#0f1729]">{task.listing.provider.name}</p><p className="text-xs text-[#8694ad]">{task.listing.provider.phone ?? '—'}</p></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={completed} onClick={() => onConfirm(task)} className="bg-[#2a7bd9] hover:bg-[#1e5aa8]">
            <Camera className="h-4 w-4" />{completed ? 'Đã xác nhận' : 'Chụp ảnh & xác nhận'}
          </Button>
          {!completed && (
            <Button variant="outline" onClick={() => onMediate(task)}>
              <Scale className="h-4 w-4" />Có bất đồng
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Condition dialog ─────────────────────────────────────────────────────
function ConditionDialog({ task, onClose, onDone }: {
  task: StaffTask | null; onClose: () => void; onDone: (msg: string) => void;
}) {
  const mutation = useConfirmStaffTask();
  const form = useForm<StaffConditionInput>({ resolver: zodResolver(staffConditionSchema) });
  const submit = form.handleSubmit((v) => {
    if (!task) return;
    mutation.mutate(
      { bookingId: task.bookingId, type: task.type, conditionNote: v.conditionNote, file: v.file },
      { onSuccess: () => { form.reset(); onClose(); onDone(task.type === 'HANDOVER' ? 'Đã xác nhận bàn giao.' : 'Đã xác nhận nhận lại.'); } },
    );
  });
  return (
    <Dialog open={Boolean(task)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task?.type === 'HANDOVER' ? 'Xác nhận giao thiết bị' : 'Xác nhận nhận lại thiết bị'}</DialogTitle>
          <DialogDescription>Ảnh và mô tả sẽ được lưu vào biên bản đối chiếu khi có tranh chấp.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Ảnh tình trạng</Label>
            <Input type="file" accept="image/*" capture="environment" onChange={(e) => form.setValue('file', e.target.files?.[0] as File, { shouldValidate: true })} />
            {form.formState.errors.file && <p className="text-xs text-red-600">{form.formState.errors.file.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Tình trạng thiết bị</Label>
            <Textarea rows={5} placeholder="Mô tả ngoại quan, phụ kiện, vết xước..." {...form.register('conditionNote')} />
            {form.formState.errors.conditionNote && <p className="text-xs text-red-600">{form.formState.errors.conditionNote.message}</p>}
          </div>
          {mutation.isError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errMsg(mutation.error)}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Huỷ</Button>
            <Button type="submit" disabled={mutation.isPending}><Upload className="h-4 w-4" />{mutation.isPending ? 'Đang lưu...' : 'Xác nhận'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Mediation dialog ─────────────────────────────────────────────────────
function MediationDialog({ task, onClose, onDone }: {
  task: StaffTask | null; onClose: () => void; onDone: (msg: string) => void;
}) {
  const mutation = useCreateMediation();
  const form = useForm<StaffMediationInput>({
    resolver: zodResolver(staffMediationSchema),
    defaultValues: { files: [], issue: '', travelerStatement: '', providerStatement: '' },
  });
  const submit = form.handleSubmit((v) => {
    if (!task) return;
    mutation.mutate({ bookingId: task.bookingId, ...v }, { onSuccess: () => { form.reset(); onClose(); onDone('Đã lập biên bản thương lượng.'); } });
  });
  return (
    <Dialog open={Boolean(task)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Biên bản thương lượng tại chỗ</DialogTitle>
          <DialogDescription>Ghi nhận trung lập ý kiến hai bên và bằng chứng trước khi quyết định.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2"><Label>Vấn đề phát sinh</Label><Textarea rows={4} {...form.register('issue')} />{form.formState.errors.issue && <p className="text-xs text-red-600">{form.formState.errors.issue.message}</p>}</div>
          <div className="space-y-2"><Label>Ý kiến Traveler</Label><Textarea rows={3} {...form.register('travelerStatement')} /></div>
          <div className="space-y-2"><Label>Ý kiến Provider</Label><Textarea rows={3} {...form.register('providerStatement')} /></div>
          <div className="space-y-2"><Label>Ảnh bằng chứng (tối đa 10)</Label><Input type="file" accept="image/*" multiple onChange={(e) => form.setValue('files', Array.from(e.target.files ?? []))} /></div>
          {mutation.isError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errMsg(mutation.error)}</p>}
          <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Huỷ</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Đang lập...' : 'Lập biên bản'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Mediation action dialog ───────────────────────────────────────────────
function MediationActionDialog({ mediation, action, onClose, onDone }: {
  mediation: StaffMediation | null; action: 'resolve' | 'escalate'; onClose: () => void; onDone: (msg: string) => void;
}) {
  const resolve = useResolveMediation();
  const escalate = useEscalateMediation();
  const resolveForm = useForm<StaffResolutionInput>({ resolver: zodResolver(staffResolutionSchema) });
  const escalateForm = useForm<StaffEscalationInput>({ resolver: zodResolver(staffEscalationSchema), defaultValues: { type: 'DAMAGE_CLAIM', priority: 'HIGH' } });
  const submitResolve = resolveForm.handleSubmit((v) => {
    if (!mediation) return;
    resolve.mutate({ id: mediation.id, resolution: v.resolution }, { onSuccess: () => { resolveForm.reset(); onClose(); onDone('Đã ghi nhận thoả thuận.'); } });
  });
  const submitEscalate = escalateForm.handleSubmit((v) => {
    if (!mediation) return;
    escalate.mutate({ id: mediation.id, type: v.type, priority: v.priority, requestedAmount: v.requestedAmount ? Number(v.requestedAmount) : undefined, additionalNotes: v.additionalNotes },
      { onSuccess: () => { escalateForm.reset(); onClose(); onDone('Đã chuyển vụ việc lên Admin.'); } });
  });
  const pending = resolve.isPending || escalate.isPending;
  const error = resolve.error ?? escalate.error;
  return (
    <Dialog open={Boolean(mediation)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{action === 'resolve' ? 'Ghi nhận thoả thuận' : 'Chuyển vụ việc lên Admin'}</DialogTitle>
          <DialogDescription className="line-clamp-2">{mediation?.issue}</DialogDescription>
        </DialogHeader>
        {action === 'resolve' ? (
          <form onSubmit={submitResolve} className="space-y-4">
            <div className="space-y-2"><Label>Nội dung hai bên đã thống nhất</Label><Textarea rows={5} {...resolveForm.register('resolution')} />{resolveForm.formState.errors.resolution && <p className="text-xs text-red-600">{resolveForm.formState.errors.resolution.message}</p>}</div>
            {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errMsg(error)}</p>}
            <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Huỷ</Button><Button type="submit" disabled={pending}>Hoàn tất thương lượng</Button></DialogFooter>
          </form>
        ) : (
          <form onSubmit={submitEscalate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Loại tranh chấp</Label><select className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" {...escalateForm.register('type')}><option value="DAMAGE_CLAIM">Hư hỏng</option><option value="REFUND_REQUEST">Hoàn tiền</option><option value="PAYMENT_DISPUTE">Thanh toán</option><option value="CANCELLATION_DISPUTE">Huỷ booking</option></select></div>
              <div className="space-y-2"><Label>Mức ưu tiên</Label><select className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" {...escalateForm.register('priority')}><option value="MEDIUM">Trung bình</option><option value="HIGH">Cao</option><option value="CRITICAL">Khẩn cấp</option></select></div>
            </div>
            <div className="space-y-2"><Label>Số tiền yêu cầu (nếu có)</Label><Input type="number" min="0" {...escalateForm.register('requestedAmount')} /></div>
            <div className="space-y-2"><Label>Ghi chú</Label><Textarea rows={3} {...escalateForm.register('additionalNotes')} /></div>
            {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errMsg(error)}</p>}
            <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Huỷ</Button><Button type="submit" variant="destructive" disabled={pending}><AlertTriangle className="h-4 w-4" />Chuyển Admin</Button></DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Upcoming booking mini-card ────────────────────────────────────────────
function UpcomingCard({ booking }: { booking: StaffBooking }) {
  return (
    <Link href={`/staff/bookings/${booking.id}`}>
      <div className="flex items-center gap-3 rounded-xl border border-[#e2e8f3] bg-white px-4 py-3 transition-colors hover:border-[#2a7bd9]/40 hover:bg-[#2a7bd9]/5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2a7bd9]/10">
          <CalendarDays className="h-4 w-4 text-[#2a7bd9]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[#0f1729]">{booking.listing.title}</p>
          <p className="text-xs text-[#8694ad]">{formatDate(booking.startDate)} → {formatDate(booking.endDate)}</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-[#8694ad]" />
      </div>
    </Link>
  );
}

function StaffWalletSection() {
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const { data: txData } = useWalletTransactions(1, 5);
  const payout = useRequestPayout();
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [payoutForm, setPayoutForm] = useState({ amount: '', bankName: '', bankAccount: '', accountName: '' });
  const [payoutMsg, setPayoutMsg] = useState('');

  const available = wallet?.availableBalance ?? 0;
  const frozen = wallet?.frozenBalance ?? 0;

  async function handlePayout() {
    const amount = parseInt(payoutForm.amount.replace(/\D/g, ''), 10);
    if (!amount || amount < 100_000 || !payoutForm.bankName || !payoutForm.bankAccount || !payoutForm.accountName) return;
    try {
      const res = await payout.mutateAsync({ amount, bankName: payoutForm.bankName, bankAccount: payoutForm.bankAccount, accountName: payoutForm.accountName });
      setPayoutMsg(res.message);
      setShowPayoutForm(false);
      setPayoutForm({ amount: '', bankName: '', bankAccount: '', accountName: '' });
    } catch (e) {
      setPayoutMsg((e as Error).message ?? 'Đã xảy ra lỗi');
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900">Ví hoa hồng</h2>
      {payoutMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {payoutMsg}
        </div>
      )}
      {walletLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[1,2,3].map(i => <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3">
              <div className="rounded-xl bg-green-50 p-2.5"><TrendingUp className="size-6 text-green-600" /></div>
              <div>
                <p className="text-xs text-slate-500">Có thể rút</p>
                <p className="text-xl font-bold text-slate-900">{available.toLocaleString('vi-VN')} ₫</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-50 p-2.5"><Lock className="size-6 text-amber-600" /></div>
              <div>
                <p className="text-xs text-slate-500">Đang giữ</p>
                <p className="text-xl font-bold text-slate-900">{frozen.toLocaleString('vi-VN')} ₫</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-2.5"><Wallet className="size-6 text-blue-600" /></div>
              <div>
                <p className="text-xs text-slate-500">Tổng số dư</p>
                <p className="text-xl font-bold text-slate-900">{(available + frozen).toLocaleString('vi-VN')} ₫</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex gap-3">
        <Button onClick={() => setShowPayoutForm((v) => !v)} disabled={available < 100_000}>
          <Wallet />Yêu cầu rút tiền
        </Button>
      </div>

      {showPayoutForm && (
        <Card>
          <CardContent className="space-y-3">
            <p className="font-semibold text-slate-900">Thông tin rút tiền</p>
            {[
              { label: 'Số tiền (VNĐ)', key: 'amount', placeholder: 'Tối thiểu 100,000' },
              { label: 'Ngân hàng', key: 'bankName', placeholder: 'VD: Vietcombank' },
              { label: 'Số tài khoản', key: 'bankAccount', placeholder: 'Số tài khoản' },
              { label: 'Tên chủ tài khoản', key: 'accountName', placeholder: 'Nguyễn Văn A' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
                <input
                  type={key === 'amount' ? 'number' : 'text'}
                  placeholder={placeholder}
                  value={payoutForm[key as keyof typeof payoutForm]}
                  onChange={(e) => setPayoutForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            ))}
            <div className="flex gap-2">
              <Button onClick={handlePayout} disabled={payout.isPending}>
                {payout.isPending ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </Button>
              <Button variant="outline" onClick={() => setShowPayoutForm(false)}>Huỷ</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {(txData?.items?.length ?? 0) > 0 && (
        <Card>
          <CardHeader><CardTitle>Lịch sử giao dịch gần đây</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-slate-100">
              {txData!.items.map((tx) => (
                <li key={tx.id} className="flex items-center justify-between px-6 py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-800">{tx.note ?? tx.type}</p>
                    <p className="text-xs text-slate-400">{new Date(tx.createdAt).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <span className={`font-semibold ${['CREDIT','COMMISSION_SPLIT','UNFREEZE','TOPUP','REFUND'].includes(tx.type) ? 'text-green-600' : 'text-red-500'}`}>
                    {['CREDIT','COMMISSION_SPLIT','UNFREEZE','TOPUP','REFUND'].includes(tx.type) ? '+' : '-'}{Number(tx.amount).toLocaleString('vi-VN')} ₫
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────
export default function StaffDashboard() {
  const [date, setDate] = useState(localDate);
  const [conditionTask, setConditionTask] = useState<StaffTask | null>(null);
  const [mediationTask, setMediationTask] = useState<StaffTask | null>(null);
  const [actionState, setActionState] = useState<{ mediation: StaffMediation; action: 'resolve' | 'escalate' } | null>(null);
  const [notice, setNotice] = useState('');

  const tasksQuery = useStaffTasks(date);
  const mediationsQuery = useStaffMediations();
  const inProgressQuery = useMyBookings({ status: 'IN_PROGRESS', limit: 5 });
  const upcomingQuery  = useMyBookings({ status: 'CONFIRMED', limit: 5 });
  const allQuery       = useMyBookings({ limit: 1 });
  const completedQuery = useMyBookings({ status: 'COMPLETED', limit: 1 });

  const tasks = useMemo(() => tasksQuery.data?.tasks ?? [], [tasksQuery.data]);
  const stats = useMemo(() => ({
    total:         allQuery.data?.total ?? 0,
    inProgress:    inProgressQuery.data?.total ?? 0,
    completed:     completedQuery.data?.total ?? 0,
    allMediations: mediationsQuery.data?.length ?? 0,
    openMediations: mediationsQuery.data?.filter((m) => m.status === 'OPEN').length ?? 0,
  }), [allQuery.data, inProgressQuery.data, completedQuery.data, mediationsQuery.data]);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-8">
      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2a7bd9]">Staff Operations</p>
        <h1 className="mt-1 text-2xl font-bold text-[#0f1729]">Dashboard</h1>
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-5 w-5 shrink-0" />{notice}
        </div>
      )}

      {/* ── Tổng quan ── */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-[#0f1729]">Tổng quan</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <Card className="border-0 shadow-sm ring-1 ring-[#e2e8f3]">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f8fafc]">
                <ClipboardList className="h-5 w-5 text-[#2a7bd9]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#2a7bd9]">{stats.total}</p>
                <p className="text-xs text-[#8694ad]">Tổng booking</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm ring-1 ring-[#e2e8f3]">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f8fafc]">
                <Package className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-violet-600">{stats.inProgress}</p>
                <p className="text-xs text-[#8694ad]">Đang thuê</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm ring-1 ring-[#e2e8f3]">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f8fafc]">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
                <p className="text-xs text-[#8694ad]">Đã hoàn thành</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm ring-1 ring-[#e2e8f3]">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f8fafc]">
                <Scale className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-2xl font-bold text-amber-600">{stats.allMediations}</p>
                  {stats.openMediations > 0 && (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                      {stats.openMediations} mở
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#8694ad]">Biên bản</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Thống kê ngày ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-bold text-[#0f1729]">Thống kê ngày</h2>
          <div className="flex items-center gap-2 rounded-xl border border-[#e2e8f3] bg-white px-3 py-2">
            <CalendarDays className="h-4 w-4 text-[#8694ad]" />
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border-0 p-0 shadow-none focus-visible:ring-0" />
          </div>
        </div>

        {/* Daily mini-stats */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-xl border border-[#e2e8f3] bg-white px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f8fafc]">
              <Clock3 className="h-4 w-4 text-[#2a7bd9]" />
            </div>
            <div>
              <p className="text-lg font-bold text-[#2a7bd9]">{tasks.length}</p>
              <p className="text-xs text-[#8694ad]">Tác vụ trong ngày</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-[#e2e8f3] bg-white px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f8fafc]">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-emerald-600">{tasks.filter((t) => t.completedAt).length}</p>
              <p className="text-xs text-[#8694ad]">Đã xử lý trong ngày</p>
            </div>
          </div>
        </div>

        <h3 className="text-sm font-semibold text-[#5a6b85]">Điểm giao nhận</h3>
        {tasksQuery.isLoading && <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>}
        {tasksQuery.isError && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{errMsg(tasksQuery.error)}</p>}
        {!tasksQuery.isLoading && tasks.length === 0 && (
          <Card className="border-0 shadow-sm ring-1 ring-[#e2e8f3]">
            <CardContent className="py-10 text-center text-[#5a6b85]">
              <CalendarDays className="mx-auto mb-3 h-10 w-10 text-[#8694ad]" />
              Không có tác vụ nào được phân công trong ngày này.
            </CardContent>
          </Card>
        )}
        <div className="grid gap-4 lg:grid-cols-2">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onConfirm={setConditionTask} onMediate={setMediationTask} />
          ))}
        </div>
      </section>

      {/* Upcoming + In-progress side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Booking sắp tới */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#0f1729]">Booking sắp tới</h2>
            <Link href="/staff/bookings?status=CONFIRMED" className="flex items-center gap-1 text-xs font-medium text-[#2a7bd9] hover:underline">
              Xem tất cả <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {upcomingQuery.isLoading && <Skeleton className="h-32 w-full" />}
          {!upcomingQuery.isLoading && (upcomingQuery.data?.items ?? []).length === 0 && (
            <p className="rounded-xl border border-dashed border-[#e2e8f3] p-5 text-center text-sm text-[#8694ad]">Không có booking đã xác nhận.</p>
          )}
          <div className="space-y-2">
            {(upcomingQuery.data?.items ?? []).map((b) => <UpcomingCard key={b.id} booking={b} />)}
          </div>
        </section>

        {/* Đang thuê */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#0f1729]">Đang thuê</h2>
            <Link href="/staff/bookings?status=IN_PROGRESS" className="flex items-center gap-1 text-xs font-medium text-[#2a7bd9] hover:underline">
              Xem tất cả <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {inProgressQuery.isLoading && <Skeleton className="h-32 w-full" />}
          {!inProgressQuery.isLoading && (inProgressQuery.data?.items ?? []).length === 0 && (
            <p className="rounded-xl border border-dashed border-[#e2e8f3] p-5 text-center text-sm text-[#8694ad]">Không có booking đang thuê.</p>
          )}
          <div className="space-y-2">
            {(inProgressQuery.data?.items ?? []).map((b) => <UpcomingCard key={b.id} booking={b} />)}
          </div>
        </section>
      </div>

      <StaffWalletSection />

      {/* Open mediations */}
      {stats.openMediations > 0 && (
        <section id="mediations" className="scroll-mt-24 space-y-3">
          <h2 className="text-base font-bold text-[#0f1729]">Biên bản thương lượng đang mở</h2>
          <div className="space-y-2">
            {mediationsQuery.data?.filter((m) => m.status === 'OPEN').map((item) => (
              <Card key={item.id} className="border-0 bg-white shadow-sm ring-1 ring-amber-200">
                <CardContent className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center">
                  <div className="space-y-1">
                    <p className="font-semibold text-[#0f1729]">{item.booking?.listing.title}</p>
                    <p className="line-clamp-1 text-sm text-[#5a6b85]">{item.issue}</p>
                    <p className="font-mono text-[10px] text-[#8694ad]">#{item.bookingId.slice(0, 8)}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="outline" onClick={() => setActionState({ mediation: item, action: 'resolve' })}>
                      <CheckCircle2 className="h-4 w-4" />Thoả thuận
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setActionState({ mediation: item, action: 'escalate' })}>
                      <AlertTriangle className="h-4 w-4" />Chuyển Admin
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* All mediations link */}
      <div className="flex items-center justify-between rounded-xl border border-[#e2e8f3] bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <Scale className="h-5 w-5 text-[#8694ad]" />
          <div>
            <p className="text-sm font-semibold text-[#0f1729]">Tất cả biên bản thương lượng</p>
            <p className="text-xs text-[#8694ad]">{mediationsQuery.data?.length ?? 0} biên bản</p>
          </div>
        </div>
        <Link href="/staff/bookings" className="flex items-center gap-1 text-xs font-medium text-[#2a7bd9] hover:underline">
          <ClipboardList className="h-4 w-4" />Xem booking <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Dialogs */}
      <ConditionDialog task={conditionTask} onClose={() => setConditionTask(null)} onDone={setNotice} />
      <MediationDialog task={mediationTask} onClose={() => setMediationTask(null)} onDone={setNotice} />
      <MediationActionDialog
        mediation={actionState?.mediation ?? null}
        action={actionState?.action ?? 'resolve'}
        onClose={() => setActionState(null)}
        onDone={setNotice}
      />
    </div>
  );
}
