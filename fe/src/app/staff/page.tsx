'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle, CalendarDays, Camera, CheckCircle2, Clock3, MapPin,
  PackageCheck, RotateCcw, Scale, Upload,
} from 'lucide-react';
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
import {
  useConfirmStaffTask, useCreateMediation, useEscalateMediation,
  useResolveMediation, useStaffMediations, useStaffTasks,
} from '@/hooks/use-staff-operations';
import {
  staffConditionSchema, staffEscalationSchema, staffMediationSchema, staffResolutionSchema,
  type StaffConditionInput, type StaffEscalationInput, type StaffMediationInput, type StaffResolutionInput,
} from '@/lib/validators/staff.schema';
import type { StaffMediation, StaffTask } from '@/types/staff';

function localDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function messageOf(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  return 'Không thể thực hiện thao tác. Vui lòng thử lại.';
}

function TaskCard({ task, onConfirm, onMediate }: {
  task: StaffTask;
  onConfirm: (task: StaffTask) => void;
  onMediate: (task: StaffTask) => void;
}) {
  const isHandover = task.type === 'HANDOVER';
  const completed = Boolean(task.completedAt);
  return (
    <Card className="border-0 bg-white shadow-sm ring-slate-200">
      <CardHeader className="border-b border-slate-100">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`rounded-xl p-2.5 ${isHandover ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {isHandover ? <PackageCheck /> : <RotateCcw />}
            </div>
            <div>
              <CardTitle>{isHandover ? 'Giao thiết bị' : 'Nhận lại thiết bị'}</CardTitle>
              <CardDescription className="mt-1 font-mono">#{task.bookingId.slice(0, 10)}</CardDescription>
            </div>
          </div>
          <Badge variant={completed ? 'secondary' : 'outline'}>
            {completed ? 'Đã hoàn thành' : 'Chờ xử lý'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="font-semibold text-slate-900">{task.listing.title}</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><MapPin className="size-4" />{task.deliveryAddress || task.listing.location}</p>
        </div>
        <div className="grid gap-3 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-2">
          <div><span className="text-slate-500">Traveler</span><p className="font-medium">{task.traveler.name}</p><p className="text-xs text-slate-500">{task.traveler.phone || task.traveler.email}</p></div>
          <div><span className="text-slate-500">Provider</span><p className="font-medium">{task.listing.provider.name}</p><p className="text-xs text-slate-500">{task.listing.provider.phone || 'Chưa có SĐT'}</p></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={completed} onClick={() => onConfirm(task)}>
            <Camera />{completed ? 'Đã xác nhận' : 'Chụp ảnh & xác nhận'}
          </Button>
          {!completed && (
            <Button variant="outline" onClick={() => onMediate(task)}>
              <Scale />Có bất đồng
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ConditionDialog({ task, onClose, onDone }: {
  task: StaffTask | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const mutation = useConfirmStaffTask();
  const form = useForm<StaffConditionInput>({ resolver: zodResolver(staffConditionSchema) });
  const submit = form.handleSubmit((values) => {
    if (!task) return;
    mutation.mutate(
      { bookingId: task.bookingId, type: task.type, conditionNote: values.conditionNote, file: values.file },
      {
        onSuccess: () => {
          form.reset();
          onClose();
          onDone(task.type === 'HANDOVER' ? 'Đã xác nhận bàn giao.' : 'Đã xác nhận nhận lại.');
        },
      },
    );
  });
  return (
    <Dialog open={Boolean(task)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task?.type === 'HANDOVER' ? 'Xác nhận giao thiết bị' : 'Xác nhận nhận lại thiết bị'}</DialogTitle>
          <DialogDescription>Ảnh và mô tả sẽ được lưu vào biên bản để đối chiếu khi có tranh chấp.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="condition-photo">Ảnh tình trạng</Label>
            <Input id="condition-photo" type="file" accept="image/*" capture="environment" onChange={(event) => form.setValue('file', event.target.files?.[0] as File, { shouldValidate: true })} />
            {form.formState.errors.file && <p className="text-xs text-red-600">{form.formState.errors.file.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="condition-note">Tình trạng thiết bị</Label>
            <Textarea id="condition-note" rows={5} placeholder="Mô tả ngoại quan, phụ kiện, vết xước hoặc hư hỏng..." {...form.register('conditionNote')} />
            {form.formState.errors.conditionNote && <p className="text-xs text-red-600">{form.formState.errors.conditionNote.message}</p>}
          </div>
          {mutation.isError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{messageOf(mutation.error)}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Huỷ</Button>
            <Button type="submit" disabled={mutation.isPending}><Upload />{mutation.isPending ? 'Đang lưu...' : 'Xác nhận'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MediationDialog({ task, onClose, onDone }: {
  task: StaffTask | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const mutation = useCreateMediation();
  const form = useForm<StaffMediationInput>({
    resolver: zodResolver(staffMediationSchema),
    defaultValues: { files: [], issue: '', travelerStatement: '', providerStatement: '' },
  });
  const submit = form.handleSubmit((values) => {
    if (!task) return;
    mutation.mutate(
      { bookingId: task.bookingId, ...values },
      { onSuccess: () => { form.reset(); onClose(); onDone('Đã lập biên bản thương lượng tại chỗ.'); } },
    );
  });
  return (
    <Dialog open={Boolean(task)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Biên bản thương lượng tại chỗ</DialogTitle>
          <DialogDescription>Ghi nhận trung lập ý kiến hai bên và bằng chứng trước khi quyết định thoả thuận hoặc chuyển Admin.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2"><Label>Vấn đề phát sinh</Label><Textarea rows={4} {...form.register('issue')} />{form.formState.errors.issue && <p className="text-xs text-red-600">{form.formState.errors.issue.message}</p>}</div>
          <div className="space-y-2"><Label>Ý kiến Traveler</Label><Textarea rows={3} {...form.register('travelerStatement')} /></div>
          <div className="space-y-2"><Label>Ý kiến Provider</Label><Textarea rows={3} {...form.register('providerStatement')} /></div>
          <div className="space-y-2"><Label>Ảnh bằng chứng (tối đa 10)</Label><Input type="file" accept="image/*" multiple onChange={(event) => form.setValue('files', Array.from(event.target.files ?? []), { shouldValidate: true })} /></div>
          {mutation.isError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{messageOf(mutation.error)}</p>}
          <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Huỷ</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Đang lập...' : 'Lập biên bản'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MediationActionDialog({ mediation, action, onClose, onDone }: {
  mediation: StaffMediation | null;
  action: 'resolve' | 'escalate';
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const resolveMutation = useResolveMediation();
  const escalateMutation = useEscalateMediation();
  const resolveForm = useForm<StaffResolutionInput>({ resolver: zodResolver(staffResolutionSchema) });
  const escalateForm = useForm<StaffEscalationInput>({ resolver: zodResolver(staffEscalationSchema), defaultValues: { type: 'DAMAGE_CLAIM', priority: 'HIGH' } });
  const submitResolve = resolveForm.handleSubmit((values) => {
    if (!mediation) return;
    resolveMutation.mutate({ id: mediation.id, resolution: values.resolution }, { onSuccess: () => { resolveForm.reset(); onClose(); onDone('Đã ghi nhận thoả thuận.'); } });
  });
  const submitEscalate = escalateForm.handleSubmit((values) => {
    if (!mediation) return;
    const amount = values.requestedAmount ? Number(values.requestedAmount) : undefined;
    escalateMutation.mutate({ id: mediation.id, type: values.type, priority: values.priority, requestedAmount: amount, additionalNotes: values.additionalNotes }, { onSuccess: () => { escalateForm.reset(); onClose(); onDone('Đã chuyển vụ việc lên Admin.'); } });
  });
  const pending = resolveMutation.isPending || escalateMutation.isPending;
  const error = resolveMutation.error ?? escalateMutation.error;
  return (
    <Dialog open={Boolean(mediation)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{action === 'resolve' ? 'Ghi nhận thoả thuận' : 'Chuyển vụ việc lên Admin'}</DialogTitle>
          <DialogDescription>{mediation?.issue}</DialogDescription>
        </DialogHeader>
        {action === 'resolve' ? (
          <form onSubmit={submitResolve} className="space-y-4">
            <div className="space-y-2"><Label>Nội dung hai bên đã thống nhất</Label><Textarea rows={5} {...resolveForm.register('resolution')} />{resolveForm.formState.errors.resolution && <p className="text-xs text-red-600">{resolveForm.formState.errors.resolution.message}</p>}</div>
            {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{messageOf(error)}</p>}
            <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Huỷ</Button><Button type="submit" disabled={pending}>Hoàn tất thương lượng</Button></DialogFooter>
          </form>
        ) : (
          <form onSubmit={submitEscalate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Loại tranh chấp</Label><select className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" {...escalateForm.register('type')}><option value="DAMAGE_CLAIM">Hư hỏng</option><option value="REFUND_REQUEST">Yêu cầu hoàn tiền</option><option value="PAYMENT_DISPUTE">Thanh toán</option><option value="CANCELLATION_DISPUTE">Huỷ booking</option></select></div>
              <div className="space-y-2"><Label>Mức ưu tiên</Label><select className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" {...escalateForm.register('priority')}><option value="MEDIUM">Trung bình</option><option value="HIGH">Cao</option><option value="CRITICAL">Khẩn cấp</option></select></div>
            </div>
            <div className="space-y-2"><Label>Số tiền yêu cầu (nếu có)</Label><Input type="number" min="0" {...escalateForm.register('requestedAmount')} /></div>
            <div className="space-y-2"><Label>Ghi chú bổ sung</Label><Textarea rows={4} {...escalateForm.register('additionalNotes')} /></div>
            {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{messageOf(error)}</p>}
            <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Huỷ</Button><Button type="submit" variant="destructive" disabled={pending}><AlertTriangle />Chuyển Admin</Button></DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function StaffOperationsPage() {
  const [date, setDate] = useState(localDate);
  const [conditionTask, setConditionTask] = useState<StaffTask | null>(null);
  const [mediationTask, setMediationTask] = useState<StaffTask | null>(null);
  const [actionState, setActionState] = useState<{ mediation: StaffMediation; action: 'resolve' | 'escalate' } | null>(null);
  const [notice, setNotice] = useState('');
  const tasksQuery = useStaffTasks(date);
  const mediationsQuery = useStaffMediations();
  const tasks = useMemo(() => tasksQuery.data?.tasks ?? [], [tasksQuery.data?.tasks]);
  const stats = useMemo(() => ({ total: tasks.length, done: tasks.filter((task) => task.completedAt).length }), [tasks]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">Staff Operations</p><h1 className="mt-1 text-3xl font-bold text-slate-950">Lịch giao nhận</h1><p className="mt-2 text-slate-600">Xử lý các điểm giao, nhận và sự cố được Admin phân công.</p></div>
        <div className="space-y-2"><Label htmlFor="task-date">Ngày làm việc</Label><div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3"><CalendarDays className="size-4 text-slate-500" /><Input id="task-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="border-0 shadow-none" /></div></div>
      </section>

      {notice && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle2 className="size-5" />{notice}</div>}

      <section className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="flex items-center gap-3"><Clock3 className="size-8 text-blue-600" /><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-slate-500">Tác vụ trong ngày</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3"><CheckCircle2 className="size-8 text-emerald-600" /><div><p className="text-2xl font-bold">{stats.done}</p><p className="text-sm text-slate-500">Đã hoàn thành</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3"><Scale className="size-8 text-amber-600" /><div><p className="text-2xl font-bold">{mediationsQuery.data?.filter((item) => item.status === 'OPEN').length ?? 0}</p><p className="text-sm text-slate-500">Đang thương lượng</p></div></CardContent></Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Điểm giao nhận</h2>
        {tasksQuery.isLoading && <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>}
        {tasksQuery.isError && <p className="rounded-xl bg-red-50 p-4 text-red-700">{messageOf(tasksQuery.error)}</p>}
        {!tasksQuery.isLoading && tasks.length === 0 && <Card><CardContent className="py-12 text-center text-slate-500"><CalendarDays className="mx-auto mb-3 size-10" />Không có tác vụ được phân công trong ngày này.</CardContent></Card>}
        <div className="grid gap-4 lg:grid-cols-2">{tasks.map((task) => <TaskCard key={task.id} task={task} onConfirm={setConditionTask} onMediate={setMediationTask} />)}</div>
      </section>

      <section id="mediations" className="scroll-mt-24 space-y-4">
        <div><h2 className="text-xl font-bold text-slate-900">Biên bản thương lượng</h2><p className="text-sm text-slate-500">Theo dõi các bất đồng đã ghi nhận tại điểm giao hoặc nhận.</p></div>
        <div className="space-y-3">
          {mediationsQuery.isLoading && <Skeleton className="h-40 w-full" />}
          {mediationsQuery.data?.map((item) => (
            <Card key={item.id} className="bg-white">
              <CardContent className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="space-y-1"><div className="flex items-center gap-2"><Badge variant={item.status === 'OPEN' ? 'outline' : 'secondary'}>{item.status === 'OPEN' ? 'Đang thương lượng' : item.status === 'RESOLVED' ? 'Đã thoả thuận' : 'Đã chuyển Admin'}</Badge><span className="font-mono text-xs text-slate-400">#{item.bookingId.slice(0, 8)}</span></div><p className="font-semibold text-slate-900">{item.booking?.listing.title}</p><p className="line-clamp-2 text-sm text-slate-600">{item.issue}</p></div>
                {item.status === 'OPEN' && <div className="flex shrink-0 gap-2"><Button variant="outline" onClick={() => setActionState({ mediation: item, action: 'resolve' })}><CheckCircle2 />Đã thoả thuận</Button><Button variant="destructive" onClick={() => setActionState({ mediation: item, action: 'escalate' })}><AlertTriangle />Chuyển Admin</Button></div>}
              </CardContent>
            </Card>
          ))}
          {!mediationsQuery.isLoading && mediationsQuery.data?.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Chưa có biên bản thương lượng.</p>}
        </div>
      </section>

      <ConditionDialog task={conditionTask} onClose={() => setConditionTask(null)} onDone={setNotice} />
      <MediationDialog task={mediationTask} onClose={() => setMediationTask(null)} onDone={setNotice} />
      <MediationActionDialog mediation={actionState?.mediation ?? null} action={actionState?.action ?? 'resolve'} onClose={() => setActionState(null)} onDone={setNotice} />
    </div>
  );
}
