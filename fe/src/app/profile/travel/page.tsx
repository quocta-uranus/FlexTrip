"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  Check,
  ChevronRight,
  Clock,
  Download,
  Heart,
  KeyRound,
  Loader2,
  Mail,
  Pencil,
  ShieldCheck,
  Trash2,
  User,
} from "lucide-react";
import { useMe, useUpdateMe, useSessions, useRevokeSession } from "@/hooks/useSession";
import { useSetAvatar } from "@/hooks/useSetAvatar";
import { useMyBookings } from "@/hooks/useBookings";
import { useMyReviews } from "@/hooks/useReviews";
import { useWishlistIds } from "@/hooks/useWishlist";
import type { UserProfile } from "@/lib/api/client";
import { TwoFactorSetupModal } from "@/components/profile/TwoFactorSetupModal";
import { TravelPreferencesSection } from "@/components/profile/TravelPreferencesSection";
import { SectionCard, SectionNav, describeDevice, type NavItem } from "@/components/profile/profile-sections";
import {
  AvatarField,
  RoleBadge,
  Timeline,
  Field,
  Input,
  Select,
  ToggleRow,
  VerifyItem,
  SecurityItem,
  StickyCta,
} from "@/components/profile/ui";
import { ConfettiBurst, useConfetti } from "@/components/profile/wow";
import { useEditingProfile } from "@/hooks/useEditingProfile";
import { Toast } from "@/components/ui/toast";
import { ReputationProgressCard } from "@/components/reputation/reputation-badge";
import { useMyReputation } from "@/hooks/useReputation";
import { BOOKING_STATUS_LABEL } from "@/types/booking";
import { cn } from "@/lib/utils";

const LANG_CODE_TO_LABEL: Record<string, string> = {
  vi: 'Tiếng Việt', en: 'English', zh: '中文', ja: '日本語', ko: '한국어', fr: 'Français',
};
const LANG_LABEL_TO_CODE: Record<string, string> = {
  'Tiếng Việt': 'vi', 'English': 'en', '中文': 'zh', '日本語': 'ja', '한국어': 'ko', 'Français': 'fr',
};
const GENDER_UP: Record<string, string> = { male: 'MALE', female: 'FEMALE', other: 'OTHER' };
const GENDER_DOWN: Record<string, string> = { MALE: 'male', FEMALE: 'female', OTHER: 'other' };

function meToForm(me: UserProfile): TravelProfile {
  return {
    fullName: me.name ?? '',
    email: me.email ?? '',
    phone: me.phone ?? '',
    dateOfBirth: me.dateOfBirth ?? '',
    gender: (GENDER_DOWN[me.gender ?? ''] ?? '') as TravelProfile['gender'],
    nationality: me.nationality ?? '',
    address: me.address ?? '',
    bio: me.bio ?? '',
    avatar: me.avatarUrl ?? '',
    emergencyContact: me.emergencyContact ?? '',
    languages: (me.languages ?? ['vi']).map((c) => LANG_CODE_TO_LABEL[c] ?? c),
    emailNotifications: true,
    smsNotifications: false,
    marketingEmails: true,
  };
}

/**
 * /profile/travel — Travel profile (Traveler). PROF-01 + PROF-02
 */

interface TravelProfile {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other" | "";
  nationality: string;
  address: string;
  bio: string;
  avatar: string;
  emergencyContact: string;
  languages: string[];
  emailNotifications: boolean;
  smsNotifications: boolean;
  marketingEmails: boolean;
}

const initialProfile: TravelProfile = {
  fullName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  gender: "",
  nationality: "",
  address: "",
  bio: "",
  avatar: "",
  emergencyContact: "",
  languages: [],
  emailNotifications: true,
  smsNotifications: false,
  marketingEmails: true,
};

const ALL_LANGUAGES = ["Tiếng Việt", "English", "中文", "日本語", "한국어", "Français"];
const STORAGE_KEY = "flextrip.profile.travel";

const NAV_ITEMS: NavItem[] = [
  { id: "thong-tin", label: "Thông tin cá nhân" },
  { id: "so-thich", label: "Sở thích du lịch" },
  { id: "hanh-trinh", label: "Hành trình gần đây" },
  { id: "thong-bao", label: "Thông báo" },
  { id: "bao-mat", label: "Bảo mật" },
  { id: "xac-minh", label: "Xác minh danh tính" },
  { id: "nguy-hiem", label: "Vùng nguy hiểm", danger: true },
];

const COMPLETION_FIELDS: Array<{ key: keyof TravelProfile; label: string }> = [
  { key: "dateOfBirth", label: "Ngày sinh" },
  { key: "gender", label: "Giới tính" },
  { key: "nationality", label: "Quốc tịch" },
  { key: "address", label: "Địa chỉ" },
  { key: "emergencyContact", label: "Liên hệ khẩn cấp" },
  { key: "bio", label: "Giới thiệu bản thân" },
  { key: "avatar", label: "Ảnh đại diện" },
];

const ICON_BUTTON =
  "inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm font-bold transition active:scale-95 disabled:opacity-60";

export default function TravelProfilePage() {
  const router = useRouter();
  const { data: p, setData: setP, editing, setEditing, save, cancel, savedAt } =
    useEditingProfile<TravelProfile>(STORAGE_KEY, initialProfile);
  const [showSaved, setShowSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const confetti = useConfetti(36);
  const [show2faModal, setShow2faModal] = useState(false);
  const { data: me } = useMe();
  const { data: reputation } = useMyReputation();
  const { mutateAsync: uploadAvatar, isPending: avatarUploading } = useSetAvatar();
  const qc = useQueryClient();
  // Bảo vệ route: chỉ TRAVELER mới được vào /profile/travel
  useEffect(() => {
    if (!me) return;
    const roles = (me.roles ?? []) as string[];
    if (!roles.includes('TRAVELER')) {
      router.replace(roles.includes('PROVIDER') ? '/profile/shop' : '/profile');
    }
  }, [me, router]);
  const { mutateAsync: updateMe, isPending: isSaving } = useUpdateMe();
  const { data: sessions } = useSessions();
  const { mutate: revokeSession, isPending: revoking } = useRevokeSession();
  const { data: bookings } = useMyBookings({ limit: 100 });
  const { data: myReviews } = useMyReviews((me?.roles ?? []).includes('TRAVELER'));
  const { ids: wishlistIds } = useWishlistIds();

  // Sync form from server whenever me loads and user is NOT editing
  useEffect(() => {
    if (!me || editing) return;
    setP(meToForm(me));
  }, [me, editing, setP]);

  const completion = computeCompletion(p);
  const missing = COMPLETION_FIELDS.filter(({ key }) => !p[key] || (Array.isArray(p[key]) && p[key].length === 0));

  function update<K extends keyof TravelProfile>(k: K, v: TravelProfile[K]) {
    setP((s) => ({ ...s, [k]: v }));
  }
  function toggleLanguage(l: string) {
    setP((s) =>
      s.languages.includes(l)
        ? { ...s, languages: s.languages.filter((x) => x !== l) }
        : { ...s, languages: [...s.languages, l] }
    );
  }
  function startEditingAt(sectionId: string) {
    setEditing(true);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleSave() {
    setSaveError(null);
    try {
      await updateMe({
        name: p.fullName,
        phone: p.phone || undefined,
        avatarUrl: p.avatar || undefined,
        dateOfBirth: p.dateOfBirth || undefined,
        gender: p.gender ? GENDER_UP[p.gender] : undefined,
        nationality: p.nationality || undefined,
        address: p.address || undefined,
        bio: p.bio || undefined,
        emergencyContact: p.emergencyContact || undefined,
        languages: p.languages.map((l) => LANG_LABEL_TO_CODE[l] ?? l),
      });

      save();
      setShowSaved(true);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 1600);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lưu thất bại, thử lại.';
      setSaveError(msg);
    }
  }

  // Real rentals of this traveler, newest first.
  const tripTimeline = useMemo(
    () =>
      [...(bookings ?? [])]
        .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
        .slice(0, 5)
        .map((b) => {
          const start = new Date(b.startDate);
          const days = Math.round((new Date(b.endDate).getTime() - start.getTime()) / 86_400_000) + 1;
          const shop = b.listing?.provider?.providerProfile?.shopName ?? b.listing?.provider?.name;
          return {
            date: `T${start.getMonth() + 1}/${start.getFullYear()}`,
            title: b.listing?.title ?? `Đơn #${b.id.slice(-8)}`,
            subtitle: `${shop ? `${shop} · ` : ""}${days} ngày`,
            badge: BOOKING_STATUS_LABEL[b.status],
          };
        }),
    [bookings],
  );

  const stats = useMemo(() => {
    const all = bookings ?? [];
    const closed = ["CANCELLED", "DISPUTED", "REFUNDING", "REFUNDED"];
    return [
      { label: "Chuyến thuê", value: all.filter((b) => b.status === "COMPLETED").length, link: { href: "/bookings", text: "Xem lịch sử" } },
      { label: "Đơn đang xử lý", value: all.filter((b) => b.status !== "COMPLETED" && !closed.includes(b.status)).length, link: { href: "/bookings", text: "Xem đơn" } },
      { label: "Đánh giá của tôi", value: myReviews?.length ?? 0, link: { href: "/profile/reviews", text: "Xem chi tiết" } },
      { label: "Thiết bị yêu thích", value: wishlistIds.length, link: { href: "/wishlist", text: "Xem danh sách" } },
    ];
  }, [bookings, myReviews, wishlistIds]);

  const travelerReputation = reputation?.badges.find(
    (badge) => badge.code === 'RELIABLE_TRAVELER',
  );

  return (
    <div className="min-h-screen bg-white pb-28">
      <div className="mx-auto max-w-7xl px-4 pt-24 sm:px-6 sm:pt-28 lg:px-8">

        {/* ── Header ── */}
        <div className="flex flex-col gap-6 rounded-3xl border border-sky-100 bg-white p-6 shadow-soft sm:flex-row sm:items-center sm:p-7">
          <div className="flex justify-center sm:justify-start">
            <div className="relative">
              <AvatarField
                name={p.fullName}
                value={p.avatar}
                uploading={avatarUploading}
                onUpload={async (file) => {
                  const url = await uploadAvatar(file);
                  qc.invalidateQueries({ queryKey: ['me'] });
                  qc.invalidateQueries({ queryKey: ['traveler-profile'] });
                  return url;
                }}
                onChange={(v) => update("avatar", v)}
                disabled={!editing}
                size="md"
                />
              <span className="absolute -bottom-2 -right-2 rounded-full bg-ink px-2.5 py-1 text-[11px] font-bold text-white shadow">
                {completion}%
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Hồ sơ của bạn</p>
            <h1 className="font-display mt-1 truncate text-3xl font-medium leading-tight tracking-[-0.03em] text-ink sm:text-4xl">
              {p.fullName || "Chưa cập nhật tên"}
            </h1>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-slate-600 sm:justify-start">
              <Mail className="h-4 w-4 text-slate-400" /> {p.email}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <RoleBadge role="TRAVELER" />
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                ID #{me?.id?.slice(-8) ?? "—"}
              </span>
              {travelerReputation && (
                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">{travelerReputation.label}</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 sm:flex-col">
            {!editing ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className={cn(ICON_BUTTON, "border border-slate-200 bg-white text-ink hover:border-brand/50 hover:text-brand-blue")}
              >
                <Pencil className="h-4 w-4" /> Chỉnh sửa
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className={cn(ICON_BUTTON, "bg-brand text-white shadow-md shadow-brand/30 hover:bg-brand-blue")}
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
                <button
                  type="button"
                  onClick={cancel}
                  disabled={isSaving}
                  className={cn(ICON_BUTTON, "border border-slate-200 bg-white text-slate-600 hover:border-slate-300")}
                >
                  Hủy
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Stats ── */}
        <dl className="mt-4 grid grid-cols-2 rounded-3xl border border-sky-100 bg-white py-2 shadow-soft lg:grid-cols-4 lg:divide-x lg:divide-sky-100">
          {stats.map((stat) => (
            <div key={stat.label} className="px-6 py-4">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{stat.label}</dt>
              <dd className="font-display mt-1 text-3xl font-medium tracking-[-0.02em] text-ink">{stat.value}</dd>
              <Link href={stat.link.href} className="text-xs font-semibold text-brand-blue hover:underline">
                {stat.link.text} →
              </Link>
            </div>
          ))}
        </dl>

        {/* ── Body ── */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[210px_minmax(0,1fr)_310px]">
          <SectionNav items={NAV_ITEMS} />

          <div className="min-w-0 space-y-6">
            <SectionCard id="thong-tin" icon={User} title="Thông tin cá nhân" desc="Thông tin cơ bản về bạn">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Họ và tên" required>
                  <Input value={p.fullName} onChange={(v) => update("fullName", v)} disabled={!editing} placeholder="Nguyễn Văn A" />
                </Field>
                <Field label="Email" required>
                  <Input type="email" value={p.email} onChange={(v) => update("email", v)} disabled={!editing} icon={<Mail className="h-4 w-4" />} />
                </Field>
                <Field label="Số điện thoại" required>
                  <Input value={p.phone} onChange={(v) => update("phone", v)} disabled={!editing} placeholder="0912 345 678" />
                </Field>
                <Field label="Ngày sinh">
                  <Input type="date" value={p.dateOfBirth} onChange={(v) => update("dateOfBirth", v)} disabled={!editing} />
                </Field>
                <Field label="Giới tính">
                  <Select value={p.gender} onChange={(v) => update("gender", v as TravelProfile["gender"])} disabled={!editing} options={[{ value: "", label: "Chọn giới tính" }, { value: "female", label: "Nữ" }, { value: "male", label: "Nam" }, { value: "other", label: "Khác" }]} />
                </Field>
                <Field label="Quốc tịch">
                  <Input value={p.nationality} onChange={(v) => update("nationality", v)} disabled={!editing} placeholder="Việt Nam" />
                </Field>
                <Field label="Địa chỉ" full>
                  <Input value={p.address} onChange={(v) => update("address", v)} disabled={!editing} placeholder="123 Đường ABC, Quận 1, TP.HCM" />
                </Field>
                <Field label="Liên hệ khẩn cấp">
                  <Input value={p.emergencyContact} onChange={(v) => update("emergencyContact", v)} disabled={!editing} placeholder="0912 345 678" />
                </Field>
                <Field label="Ngôn ngữ" full>
                  <div className="flex flex-wrap gap-2">
                    {ALL_LANGUAGES.map((lang) => {
                      const active = p.languages.includes(lang);
                      return (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => editing && toggleLanguage(lang)}
                          disabled={!editing}
                          aria-pressed={active}
                          className={cn(
                            "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                            editing ? "cursor-pointer" : "cursor-default",
                            active
                              ? "border-ink bg-ink text-white"
                              : "border-slate-200 bg-white text-slate-600",
                            editing && !active && "hover:border-brand/50",
                          )}
                        >
                          {lang}
                        </button>
                      );
                    })}
                  </div>
                </Field>
                <Field label="Giới thiệu bản thân" full>
                  <textarea
                    value={p.bio}
                    disabled={!editing}
                    onChange={(e) => update("bio", e.target.value)}
                    rows={3}
                    placeholder="Một vài dòng giới thiệu về bạn..."
                    className={cn(
                      "w-full rounded-2xl border bg-white px-4 py-3 text-sm font-medium outline-none transition-colors placeholder:font-normal placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20",
                      editing ? "border-slate-200 text-ink hover:border-brand/60" : "border-slate-100 bg-slate-50 text-slate-600",
                    )}
                  />
                </Field>
              </div>
            </SectionCard>

            {/* ── Sở thích du lịch (PROF-02) ── */}
            <TravelPreferencesSection />

            <SectionCard
              id="hanh-trinh"
              icon={Clock}
              title="Hành trình gần đây"
              desc="Các chuyến thuê của bạn"
              action={
                tripTimeline.length > 0 ? (
                  <Link href="/bookings" className="shrink-0 rounded-full border border-slate-200 px-4 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:border-brand/50 hover:text-brand-blue">
                    Xem tất cả
                  </Link>
                ) : undefined
              }
            >
              {tripTimeline.length > 0 ? (
                <Timeline items={tripTimeline} />
              ) : (
                <p className="rounded-2xl bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
                  Bạn chưa có chuyến thuê nào.{" "}
                  <Link href="/search" className="font-semibold text-brand-blue hover:underline">
                    Khám phá thiết bị
                  </Link>
                </p>
              )}
            </SectionCard>

            <SectionCard id="thong-bao" icon={Bell} title="Thông báo" desc="Cách chúng tôi liên lạc với bạn">
              <ToggleRow label="Email thông báo" desc="Đặt thuê, nhắc lịch, cập nhật quan trọng" value={p.emailNotifications} onChange={(v) => update("emailNotifications", v)} disabled={!editing} />
              <ToggleRow label="SMS thông báo" desc="OTP và cảnh báo bảo mật" value={p.smsNotifications} onChange={(v) => update("smsNotifications", v)} disabled={!editing} />
              <ToggleRow label="Email marketing" desc="Ưu đãi và gợi ý chuyến đi" value={p.marketingEmails} onChange={(v) => update("marketingEmails", v)} disabled={!editing} />
            </SectionCard>

            <SectionCard id="bao-mat" icon={KeyRound} title="Bảo mật" desc="Mật khẩu, xác thực và thiết bị đăng nhập">
              <SecurityItem
                icon={<KeyRound className="h-5 w-5" />}
                title="Mật khẩu"
                desc="Đổi mật khẩu đăng nhập của bạn"
                action="Đổi mật khẩu"
                href="/forgot-password"
              />
              <SecurityItem
                icon={<ShieldCheck className="h-5 w-5" />}
                title="Xác thực 2 lớp (2FA)"
                desc={me?.twoFactorEnabled ? "Đang bật" : "Chưa bật"}
                action={me?.twoFactorEnabled ? undefined : "Bật ngay"}
                onAction={() => setShow2faModal(true)}
              />

              {sessions && sessions.length > 0 && (
                <div className="mt-2 border-t border-slate-100 pt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Phiên đang hoạt động</p>
                  <div className="space-y-2">
                    {sessions.slice(0, 3).map((s) => (
                      <div key={s.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">{describeDevice(s.deviceName, s.userAgent)}</p>
                          <p className="text-xs text-slate-500">{s.ipAddress || "—"}</p>
                        </div>
                        {s.isCurrent ? (
                          <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-bold text-green-700">Thiết bị này</span>
                        ) : (
                          <button
                            type="button"
                            disabled={revoking}
                            onClick={() => revokeSession(s.id)}
                            className="shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                          >
                            Thu hồi
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </SectionCard>
          </div>

          <aside className="min-w-0 space-y-6">
            <section className="rounded-3xl border border-sky-100 bg-white p-6 shadow-soft">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-display text-xl font-medium tracking-[-0.02em] text-ink">Hoàn thiện hồ sơ</h2>
                <span className="text-sm font-bold text-brand-blue">{completion}%</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-brand transition-all duration-700" style={{ width: `${completion}%` }} />
              </div>
              {missing.length === 0 ? (
                <p className="mt-4 flex items-center gap-2 text-sm font-medium text-green-700">
                  <Check className="h-4 w-4" /> Hồ sơ của bạn đã đầy đủ.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-slate-100">
                  {missing.slice(0, 5).map(({ key, label }) => (
                    <li key={key}>
                      <button
                        type="button"
                        onClick={() => startEditingAt("thong-tin")}
                        className="flex w-full items-center gap-3 py-2.5 text-left text-sm text-slate-600 transition-colors hover:text-ink"
                      >
                        <span className="h-4 w-4 shrink-0 rounded-full border-[1.5px] border-slate-300" />
                        <span className="flex-1">{label}</span>
                        <span className="text-xs font-bold text-brand-blue">Thêm →</span>
                      </button>
                    </li>
                  ))}
                  {missing.length > 5 && <li className="pt-2.5 text-xs text-slate-500">và {missing.length - 5} mục khác</li>}
                </ul>
              )}
            </section>

            {travelerReputation && <ReputationProgressCard badge={travelerReputation} />}

            <SectionCard id="xac-minh" icon={ShieldCheck} title="Xác minh danh tính" desc="Tăng độ tin cậy">
              <VerifyItem label="Email" done />
              <VerifyItem label="Số điện thoại" done={Boolean(p.phone)} />
              <VerifyItem label="CMND / CCCD" done={Boolean(me?.isKycVerified)} />
              <VerifyItem label="Xác minh khuôn mặt" done={me?.kycStatus === "VERIFIED"} />
            </SectionCard>

            <section className="rounded-3xl border border-sky-100 bg-white p-3 shadow-soft">
              {[
                { href: "/profile", label: "Đổi hồ sơ khác" },
                { href: "/profile/preferences", label: "Tùy chọn du lịch" },
                { href: "/wishlist", label: "Thiết bị yêu thích", icon: Heart },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-ink transition-colors hover:bg-slate-50"
                >
                  {label}
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </Link>
              ))}
            </section>

            <SectionCard id="nguy-hiem" icon={AlertTriangle} title="Vùng nguy hiểm" desc="Hành động không thể hoàn tác" tone="danger">
              <div className="space-y-2">
                <button
                  type="button"
                  disabled={!editing}
                  onClick={() => alert("Đã gửi yêu cầu xuất dữ liệu đến email của bạn.")}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 transition-colors hover:border-brand/50 disabled:opacity-60"
                >
                  <span>Tải dữ liệu cá nhân</span>
                  <Download className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={!editing}
                  onClick={() => confirm("Bạn có chắc chắn muốn xóa tài khoản?") && alert("Đã gửi yêu cầu.")}
                  className="flex w-full items-center justify-between rounded-2xl border border-red-200 bg-white px-4 py-3 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                >
                  <span>Xóa tài khoản</span>
                  <Trash2 className="h-4 w-4" />
                </button>
                {!editing && <p className="pt-1 text-xs text-slate-500">Bấm &ldquo;Chỉnh sửa&rdquo; để dùng các thao tác này.</p>}
              </div>
            </SectionCard>
          </aside>
        </div>
      </div>

      {show2faModal && (
        <TwoFactorSetupModal
          onClose={() => setShow2faModal(false)}
          onEnabled={() => {
            setShow2faModal(false);
            qc.invalidateQueries({ queryKey: ['me'] });
          }}
        />
      )}

      <StickyCta
        editing={editing}
        savedAt={savedAt}
        onSave={handleSave}
        onCancel={cancel}
        saving={isSaving}
        primary={{ label: "📅 Đặt chuyến mới", onClick: () => router.push('/search') }}
        secondary={{ label: "💬 Chat CSKH", onClick: () => alert('Chat coming soon!') }}
      />
      {showConfetti && <ConfettiBurst pieces={confetti} />}
      <Toast show={showSaved} message="Đã lưu hồ sơ thành công!" onClose={() => setShowSaved(false)} />
      {saveError && (
        <Toast show={Boolean(saveError)} message={saveError} onClose={() => setSaveError(null)} />
      )}
    </div>
  );
}

function computeCompletion(p: TravelProfile): number {
  const checks: boolean[] = [
    Boolean(p.fullName.trim()),
    /^\S+@\S+\.\S+$/.test(p.email),
    Boolean(p.phone.trim()),
    Boolean(p.dateOfBirth),
    Boolean(p.gender),
    Boolean(p.nationality.trim()),
    Boolean(p.address.trim()),
    Boolean(p.bio.trim()),
    Boolean(p.avatar),
    Boolean(p.emergencyContact.trim()),
    p.languages.length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
