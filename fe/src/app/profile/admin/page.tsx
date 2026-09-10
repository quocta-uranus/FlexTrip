"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  SectionTitle,
  ProfileHeader,
  AvatarField,
  RoleBadge,
  KpiCards,
  Timeline,
  ToggleRow,
  SecurityItem,
  Field,
  Input,
  StickyCta,
} from "@/components/profile/ui";
import {
  Reveal,
  MagneticAvatar,
  Counter,
  LiveDot,
  ConfettiBurst,
  PulseDot,
  AnimatedGradientText,
  EditingBanner,
  StickyEditBar,
  useConfetti,
} from "@/components/profile/wow";
import { useEditingProfile } from "@/hooks/useEditingProfile";

/**
 * /profile/admin — Admin profile.
 */

interface AdminProfile {
  fullName: string;
  email: string;
  phone: string;
  employeeId: string;
  department: "Operations" | "Trust & Safety" | "Finance" | "Support" | "Engineering";
  level: "L1" | "L2" | "L3";
  avatar: string;
  bio: string;
  openTickets: number;
  resolvedToday: number;
  activeUsers: number;
  pendingFlags: number;
  configChanges: number;
  scopes: string[];
  notifTicket: boolean;
  notifFlag: boolean;
  notifConfig: boolean;
}

const initial: AdminProfile = {
  fullName: "Trần Quốc Bảo",
  email: "bao.admin@flextrip.vn",
  phone: "+84 909 000 999",
  employeeId: "EMP-AD-0042",
  department: "Trust & Safety",
  level: "L2",
  avatar: "",
  bio: "Admin phụ trách KYC, fraud flag và hỗ trợ các tranh chấp cấp Provider–Traveler.",
  openTickets: 14,
  resolvedToday: 9,
  activeUsers: 1284,
  pendingFlags: 6,
  configChanges: 2,
  scopes: [
    "👥 User management (read/write)",
    "🛡 Trust & Safety (KYC, fraud)",
    "💬 Support ticket (assign, reply)",
    "⚙️ System config (read)",
    "📊 Report export (read)",
  ],
  notifTicket: true,
  notifFlag: true,
  notifConfig: false,
};

const ALL_SCOPES = [
  "👥 User management (read/write)",
  "🛡 Trust & Safety (KYC, fraud)",
  "💬 Support ticket (assign, reply)",
  "⚙️ System config (read/write)",
  "📊 Report export (read)",
  "💰 Finance / Payout approval",
  "🚫 Account sanction (suspend, blacklist)",
];

export default function AdminProfilePage() {
  const { data: p, setData: setP, editing, setEditing, save, cancel, savedAt } =
    useEditingProfile<AdminProfile>("flextrip.profile.admin", initial);
  const [showConfetti, setShowConfetti] = useState(false);
  const confetti = useConfetti(36);

  const completion = computeCompletion(p);

  function update<K extends keyof AdminProfile>(k: K, v: AdminProfile[K]) {
    setP((s) => ({ ...s, [k]: v }));
  }
  function toggleScope(sc: string) {
    setP((s) =>
      s.scopes.includes(sc)
        ? { ...s, scopes: s.scopes.filter((x) => x !== sc) }
        : { ...s, scopes: [...s.scopes, sc] }
    );
  }
  function handleSave() {
    save();
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 1600);
  }

  const recentActions = [
    { date: "10:42 hôm nay", title: "Approve KYC — Nguyễn Văn X", subtitle: "Trust & Safety · review CCCD + selfie", badge: "KYC" },
    { date: "09:15 hôm nay", title: "Đóng ticket #SUP-1934", subtitle: "Refund 50% do lỗi listing", badge: "Ticket" },
    { date: "08:50 hôm nay", title: "Cập nhật SYSTEM_CONFIG: BOOK-07 cancel window", subtitle: "5 → 7 ngày trước check-in", badge: "Config" },
    { date: "Hôm qua 17:20", title: "Suspend listing #LST-882 (fake flag)", subtitle: "Đã thông báo provider", badge: "Trust" },
    { date: "Hôm qua 14:05", title: "Bulk assign 12 ticket cho Support L1", subtitle: "Round-robin theo shift", badge: "Ticket" },
  ];

  return (
    <div className="pb-28">
      <ProfileHeader
        eyebrow="ADMIN"
        identityId={p.employeeId}
        roleBadge={<RoleBadge role="ADMIN" />}
        name={p.fullName}
        subtitle={`${p.email} · ${p.department} · Level ${p.level}`}
        completion={completion}
        avatar={
          <div className="relative">
            <MagneticAvatar strength={0.22}>
              <AvatarField
                name={p.fullName}
                value={p.avatar}
                onChange={(v) => update("avatar", v)}
                disabled={!editing}
              />
            </MagneticAvatar>
            {/* ON-DUTY badge đập đỏ góc avatar */}
            <div className="absolute -bottom-2 -right-2">
              <LiveDot label="ON-DUTY" tone="red" />
            </div>
          </div>
        }
        actions={
          !editing ? (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-transform hover:scale-105"
              style={{ background: "#0f1729", boxShadow: "0 8px 20px -8px rgba(15,23,41,0.6)" }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Cập nhật hồ sơ
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-transform hover:scale-105"
                style={{ background: "#0f1729", boxShadow: "0 8px 20px -8px rgba(15,23,41,0.6)" }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Lưu
              </button>
              <button
                onClick={cancel}
                className="rounded-full border bg-white px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--surface-muted)]"
                style={{ borderColor: "#e2e8f3" }}
              >
                Hủy
              </button>
            </>
          )
        }
      />

      <EditingBanner visible={editing} />

      {savedAt && (
        <div className="mx-auto mt-4 max-w-6xl px-6">
          <div
            className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm"
            style={{ borderColor: "rgba(146,238,232,0.4)", background: "rgba(146,238,232,0.15)", color: "#1e5aa8" }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Đã lưu hồ sơ admin lúc {savedAt}
          </div>
        </div>
      )}

      <section className="mx-auto mt-8 max-w-6xl px-6">
        <Reveal>
          <KpiCards
            items={[
              {
                label: "Ticket đang mở",
                value: p.openTickets,
                hint: "SLA 24h",
                valueNode: <Counter value={p.openTickets} />,
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                ),
              },
              {
                label: "Resolved hôm nay",
                value: p.resolvedToday,
                hint: "+2 so với hôm qua",
                valueNode: <Counter value={p.resolvedToday} />,
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ),
              },
              {
                label: "Active users",
                value: p.activeUsers,
                hint: "last 7d",
                valueNode: <Counter value={p.activeUsers} />,
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                ),
              },
              {
                label: "Flag chờ duyệt",
                value: p.pendingFlags,
                hint: "fraud + fake listing",
                valueNode: <Counter value={p.pendingFlags} />,
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                  </svg>
                ),
              },
            ]}
          />
        </Reveal>
      </section>

      <section className="mx-auto mt-12 grid max-w-6xl gap-6 px-6 lg:grid-cols-3">
        <Card title="Thông tin admin" subtitle="PROF-01 (Admin)" className="lg:col-span-2">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Họ và tên" required>
              <Input value={p.fullName} onChange={(v) => update("fullName", v)} disabled={!editing} />
            </Field>
            <Field label="Mã nhân viên" required>
              <Input value={p.employeeId} onChange={(v) => update("employeeId", v)} disabled={!editing} />
            </Field>
            <Field label="Email nội bộ" required>
              <Input
                type="email"
                value={p.email}
                onChange={(v) => update("email", v)}
                disabled={!editing}
                icon={
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
              />
            </Field>
            <Field label="Số điện thoại">
              <Input value={p.phone} onChange={(v) => update("phone", v)} disabled={!editing} />
            </Field>
            <Field label="Phòng ban">
              <select
                value={p.department}
                onChange={(e) => update("department", e.target.value as AdminProfile["department"])}
                disabled={!editing}
                className="w-full appearance-none rounded-lg border bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 disabled:bg-[var(--surface-muted)]"
                style={{ borderColor: "#e2e8f3" }}
              >
                <option>Operations</option>
                <option>Trust & Safety</option>
                <option>Finance</option>
                <option>Support</option>
                <option>Engineering</option>
              </select>
            </Field>
            <Field label="Level">
              <select
                value={p.level}
                onChange={(e) => update("level", e.target.value as AdminProfile["level"])}
                disabled={!editing}
                className="w-full appearance-none rounded-lg border bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 disabled:bg-[var(--surface-muted)]"
                style={{ borderColor: "#e2e8f3" }}
              >
                <option>L1</option>
                <option>L2</option>
                <option>L3</option>
              </select>
            </Field>
            <Field label="Mô tả công việc" full>
              <textarea
                value={p.bio}
                disabled={!editing}
                onChange={(e) => update("bio", e.target.value)}
                rows={3}
                className="w-full rounded-lg border bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 disabled:bg-[var(--surface-muted)]"
                style={{ borderColor: "#e2e8f3" }}
              />
            </Field>
          </div>
        </Card>

        <Card title="Phạm vi quyền" subtitle="RBAC scope" accent>
          <p className="mb-3 text-xs" style={{ color: "#5a6b85" }}>
            Scope hiện tại do Super-admin cấp. Bạn không thể tự thay đổi — chỉ xem.
          </p>
          <div className="space-y-2">
            {p.scopes.map((sc) => (
              <div
                key={sc}
                className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                style={{
                  borderColor: "#92eee8",
                  background: "rgba(146,238,232,0.12)",
                  color: "#1e5aa8",
                }}
              >
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {sc}
              </div>
            ))}
          </div>
          {editing && (
            <div className="mt-4 border-t pt-3" style={{ borderColor: "#e2e8f3" }}>
              <div className="mb-2 text-xs font-semibold" style={{ color: "#5a6b85" }}>
                Yêu cầu thêm:
              </div>
              <div className="space-y-1.5">
                {ALL_SCOPES.filter((s) => !p.scopes.includes(s)).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleScope(s)}
                    className="flex w-full items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-left text-sm hover:bg-[var(--surface-muted)]"
                    style={{ borderColor: "#92eee8" }}
                  >
                    <span style={{ color: "#2a7bd9" }}>+</span>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card title="Recent admin actions" subtitle="Hoạt động quản trị gần nhất" className="lg:col-span-2">
          <Timeline items={recentActions} />
        </Card>

        <Card title="Audit log" subtitle="Toàn bộ hành động của bạn">
          <div className="rounded-xl border p-4" style={{ borderColor: "#e2e8f3", background: "#f1f5fa" }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold tabular-nums">{p.configChanges}</div>
                <div className="text-xs" style={{ color: "#5a6b85" }}>
                  thay đổi SYSTEM_CONFIG trong tuần này
                </div>
              </div>
            </div>
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold"
              style={{ color: "#2a7bd9" }}
            >
              Mở audit log đầy đủ →
            </button>
          </div>
        </Card>

        <Card title="Thông báo admin" subtitle="Cảnh báo tác vụ quan trọng" className="lg:col-span-3">
          <div className="grid gap-0 sm:grid-cols-3 sm:gap-6">
            <div className="space-y-3">
              <ToggleRow label="Ticket SLA breach" desc="Cảnh báo khi ticket quá hạn 24h" value={p.notifTicket} onChange={(v) => update("notifTicket", v)} disabled={!editing} />
            </div>
            <div className="space-y-3">
              <ToggleRow label="Fraud / fake listing" desc="Push ngay khi có flag mới" value={p.notifFlag} onChange={(v) => update("notifFlag", v)} disabled={!editing} />
            </div>
            <div className="space-y-3">
              <ToggleRow label="SYSTEM_CONFIG thay đổi" desc="Email digest mỗi ngày" value={p.notifConfig} onChange={(v) => update("notifConfig", v)} disabled={!editing} />
            </div>
          </div>
        </Card>

        <Card title="Bảo mật (bắt buộc)" subtitle="Admin tài khoản yêu cầu 2FA" className="lg:col-span-3">
          <div className="grid gap-6 sm:grid-cols-3">
            <SecurityItem
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
              title="Mật khẩu"
              desc="Rotate mỗi 30 ngày — còn 12 ngày"
              action="Đổi"
            />
            <SecurityItem
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              }
              title="2FA — bắt buộc"
              desc="Authenticator + hardware key"
              action="Quản lý"
            />
            <SecurityItem
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              }
              title="Active sessions"
              desc="3 thiết bị · quản lý & thu hồi"
              action="Xem"
            />
          </div>
        </Card>
      </section>

      <section className="mx-auto mt-12 max-w-6xl px-6">
        <div className="rounded-2xl border bg-white p-6" style={{ borderColor: "#e2e8f3" }}>
          <h3 className="mb-1 text-lg font-semibold">Công cụ nhanh</h3>
          <p className="mb-5 text-sm" style={{ color: "#5a6b85" }}>Truy cập module quản trị thường dùng</p>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { code: "ADMIN-09", title: "Action log" },
              { code: "SUPPORT-01", title: "Ticket queue" },
              { code: "TRUST-01", title: "Fraud review" },
              { code: "REPORT-01", title: "Export report" },
            ].map((q) => (
              <Link
                key={q.code}
                href="/profile"
                className="group flex items-center justify-between rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
                style={{ borderColor: "#e2e8f3", background: "#f1f5fa" }}
              >
                <div>
                  <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: "rgba(42,123,217,0.1)", color: "#2a7bd9" }}>{q.code}</span>
                  <div className="mt-2 text-sm font-semibold">{q.title}</div>
                </div>
                <svg className="h-4 w-4" style={{ color: "#8694ad" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <StickyCta primary={{ label: "📋 Mở ticket queue" }} secondary={{ label: "🚩 Xem fraud flag" }} />
      <StickyEditBar visible={editing} onSave={handleSave} onCancel={cancel} brand="#0f1729" />
      {showConfetti && <ConfettiBurst pieces={confetti} />}
    </div>
  );
}

function computeCompletion(p: AdminProfile): number {
  const checks: boolean[] = [
    Boolean(p.fullName.trim()),
    /^\S+@\S+\.\S+$/.test(p.email),
    Boolean(p.employeeId.trim()),
    Boolean(p.phone.trim()),
    Boolean(p.bio.trim()),
    Boolean(p.avatar),
    Boolean(p.department),
    p.scopes.length >= 3,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
