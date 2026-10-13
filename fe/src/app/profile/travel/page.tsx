"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMe, useUpdateMe, useSessions, useRevokeSession } from "@/hooks/useSession";
import { useSetAvatar } from "@/hooks/useSetAvatar";
import { useQueryClient } from "@tanstack/react-query";
import type { UserProfile } from "@/lib/api/client";
import { TwoFactorSetupModal } from "@/components/profile/TwoFactorSetupModal";
import { TravelPreferencesSection } from "@/components/profile/TravelPreferencesSection";
import Link from "next/link";
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
import {
  MagneticAvatar,
  ConfettiBurst,
  useConfetti,
} from "@/components/profile/wow";
import { useEditingProfile } from "@/hooks/useEditingProfile";
import { Toast } from "@/components/ui/toast";
import { ReputationProgressCard } from "@/components/reputation/reputation-badge";
import { useMyReputation } from "@/hooks/useReputation";

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
    tripsCount: 0,
    rating: 5.0,
    reviewsGiven: 0,
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
  tripsCount: number;
  rating: number;
  reviewsGiven: number;
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
  tripsCount: 0,
  rating: 0,
  reviewsGiven: 0,
  emailNotifications: true,
  smsNotifications: false,
  marketingEmails: true,
};

const ALL_LANGUAGES = ["Tiếng Việt", "English", "中文", "日本語", "한국어", "Français"];
const STORAGE_KEY = "flextrip.profile.travel";

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

  // Sync form from server whenever me loads and user is NOT editing
  useEffect(() => {
    if (!me || editing) return;
    setP(meToForm(me));
  }, [me, editing, setP]);

  const completion = computeCompletion(p);

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

  const tripTimeline = [
    { date: "T8/2026", title: "Thuê lều ở Sơn Trà", subtitle: "Minhan Outdoor Gear · 3 ngày", badge: "Treks" },
    { date: "T6/2026", title: "Trekking Bà Nà Hills", subtitle: "Klook FlexTrip · 1 ngày", badge: "Day-trip" },
    { date: "T4/2026", title: "Camping Cù Lao Chàm", subtitle: "HaiAn Camping · 2 ngày", badge: "Camp" },
    { date: "T2/2026", title: "City tour Đà Nẵng", subtitle: "FlexTrip Verified · nửa ngày", badge: "City" },
  ];

  const travelerReputation = reputation?.badges.find(
    (badge) => badge.code === 'RELIABLE_TRAVELER',
  );

  return (
    <div className="min-h-screen pb-28" style={{ background: "linear-gradient(180deg, #f0f7ff 0%, #ffffff 40%)" }}>

      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1e5aa8 0%, #2a7bd9 50%, #5fd6cd 100%)" }}>
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-10 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(146,238,232,0.3) 0%, transparent 50%)" }} />

        <div className="relative mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
            <div className="flex justify-center sm:justify-start">
              <div className="relative">
                <div className="absolute -inset-2 rounded-full bg-white/30 blur-sm" />
                <MagneticAvatar>
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
                    size="lg"
                  />
                </MagneticAvatar>
                <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold" style={{ background: "#2a7bd9", borderColor: "#fff", color: "#fff" }}>
                  {completion}%
                </div>
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <RoleBadge role="TRAVELER" />
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
                  ID #{me?.id?.slice(-8) ?? "FLX-20250048"}
                </span>
              </div>
              <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">{p.fullName || "Chưa cập nhật tên"}</h1>
              <p className="mt-1 text-white/80">{p.email}</p>

              <div className="mt-4 max-w-sm mx-auto sm:mx-0">
                <div className="flex items-center justify-between text-xs text-white/80 mb-1.5">
                  <span>Hồ sơ hoàn thiện</span>
                  <span className="font-bold text-white">{completion}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/30">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${completion}%`, background: "linear-gradient(90deg, #92eee8, #fff)" }}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-3 sm:flex-col">
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold shadow-lg transition-all hover:scale-105 hover:shadow-xl"
                  style={{ color: "#1e5aa8" }}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Chỉnh sửa
                </button>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold shadow-lg transition-all hover:scale-105 disabled:opacity-60"
                    style={{ color: "#1e5aa8" }}
                  >
                    {isSaving ? (
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                  <button
                    onClick={cancel}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 rounded-full border-2 border-white/50 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 disabled:opacity-50"
                  >
                    Hủy
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 pt-6">
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Chuyến thuê", value: p.tripsCount, icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", color: "#2a7bd9", bg: "rgba(42,123,217,0.1)", href: undefined },
            { label: "Đánh giá", value: `${p.rating.toFixed(1)} ⭐`, icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.539 1.118l-3.36-2.448a1 1 0 00-1.176 0l-3.36 2.448c-.783.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", href: undefined },
            { label: "Đánh giá của tôi", value: p.reviewsGiven, icon: "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z", color: "#10b981", bg: "rgba(16,185,129,0.1)", href: "/profile/reviews" },
            { label: "Ngân sách", value: "Theo từng chuyến đi", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)", href: undefined },
          ].map((k, i) => (
            <div key={k.label} className="contents">
              {k.href ? (
                <Link
                  href={k.href}
                  aria-label="Xem các đánh giá của tôi"
                  className="group relative overflow-hidden rounded-2xl border border-white/50 bg-white/80 p-5 shadow-lg backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-10 blur-2xl" style={{ background: k.color }} />
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wider" style={{ color: k.color }}>{k.label}</div>
                      <div className="mt-2 text-xl font-bold sm:text-2xl" style={{ color: "#0f1729" }}>{k.value}</div>
                      <div className="mt-2 text-xs font-semibold" style={{ color: k.color }}>Xem chi tiết →</div>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl shadow-sm" style={{ background: k.bg, color: k.color }}>
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d={k.icon} />
                      </svg>
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="group relative overflow-hidden rounded-2xl border border-white/50 bg-white/80 p-5 shadow-lg backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-xl" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-10 blur-2xl" style={{ background: k.color }} />
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider" style={{ color: k.color }}>{k.label}</div>
                  <div className="mt-2 text-xl font-bold sm:text-2xl" style={{ color: "#0f1729" }}>{k.value}</div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl shadow-sm" style={{ background: k.bg, color: k.color }}>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d={k.icon} />
                  </svg>
                </div>
              </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {travelerReputation && (
          <div className="mb-8">
            <ReputationProgressCard badge={travelerReputation} />
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="overflow-hidden rounded-2xl border border-white/50 bg-white shadow-lg">
              <div className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl shadow-sm" style={{ background: "rgba(42,123,217,0.1)", color: "#2a7bd9" }}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold" style={{ color: "#0f1729" }}>Thông tin cá nhân</h3>
                    <p className="text-xs" style={{ color: "#8694ad" }}>Thông tin cơ bản về bạn</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Họ và tên" required>
                    <Input value={p.fullName} onChange={(v) => update("fullName", v)} disabled={!editing} placeholder="Nguyễn Văn A" />
                  </Field>
                  <Field label="Email" required>
                    <Input type="email" value={p.email} onChange={(v) => update("email", v)} disabled={!editing} icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>} />
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
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                              !editing ? "cursor-default" : "cursor-pointer hover:scale-105"
                            }`}
                            style={
                              active
                                ? { borderColor: "#2a7bd9", background: "#2a7bd9", color: "white" }
                                : { borderColor: "#e2e8f3", background: "white", color: "#0f1729" }
                            }
                          >
                            {lang}
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                  <Field label="Giới thiệu bản thân" full>
                    <textarea value={p.bio} disabled={!editing} onChange={(e) => update("bio", e.target.value)} rows={3} placeholder="Một vài dòng giới thiệu về bạn..." className="w-full rounded-lg border border-[#e2e8f3] bg-[rgba(146,238,232,0.08)] px-4 py-2.5 text-sm outline-none transition-all focus:border-[#2a7bd9] focus:ring-2 focus:ring-[#2a7bd9]/20 disabled:bg-[#f1f5fa] disabled:text-[#8694ad]" />
                  </Field>
                </div>
              </div>
            </div>

            {/* ── Sở thích du lịch (PROF-02) ── */}
            <TravelPreferencesSection />

            <div className="overflow-hidden rounded-2xl border border-white/50 bg-white shadow-lg">
              <div className="border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl shadow-sm" style={{ background: "rgba(139,92,246,0.1)", color: "#8b5cf6" }}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold" style={{ color: "#0f1729" }}>Hành trình gần đây</h3>
                    <p className="text-xs" style={{ color: "#8694ad" }}>Lịch sử các chuyến thuê của bạn</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <Timeline items={tripTimeline} />
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/50 bg-white shadow-lg">
              <div className="border-b border-gray-100 bg-gradient-to-r from-orange-50 to-yellow-50 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl shadow-sm" style={{ background: "rgba(249,115,22,0.1)", color: "#f97316" }}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold" style={{ color: "#0f1729" }}>Thông báo</h3>
                    <p className="text-xs" style={{ color: "#8694ad" }}>Cách chúng tôi liên lạc với bạn</p>
                  </div>
                </div>
              </div>
              <div className="p-2">
                <ToggleRow label="Email thông báo" desc="Đặt thuê, nhắc lịch, cập nhật quan trọng" value={p.emailNotifications} onChange={(v) => update("emailNotifications", v)} disabled={!editing} />
                <ToggleRow label="SMS thông báo" desc="OTP và cảnh báo bảo mật" value={p.smsNotifications} onChange={(v) => update("smsNotifications", v)} disabled={!editing} />
                <ToggleRow label="Email marketing" desc="Ưu đãi và gợi ý chuyến đi" value={p.marketingEmails} onChange={(v) => update("marketingEmails", v)} disabled={!editing} />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="overflow-hidden rounded-2xl border border-white/50 bg-white shadow-lg">
              <div className="border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl shadow-sm" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold" style={{ color: "#0f1729" }}>Xác minh danh tính</h3>
                    <p className="text-xs" style={{ color: "#8694ad" }}>Tăng độ tin cậy</p>
                  </div>
                </div>
              </div>
              <div className="p-2">
                <VerifyItem label="Email" done />
                <VerifyItem label="Số điện thoại" done />
                <VerifyItem label="CMND / CCCD" />
                <VerifyItem label="Xác minh khuôn mặt" />
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/50 bg-white shadow-lg">
              <div className="border-b border-gray-100 bg-gradient-to-r from-red-50 to-orange-50 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl shadow-sm" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold" style={{ color: "#0f1729" }}>Bảo mật</h3>
                    <p className="text-xs" style={{ color: "#8694ad" }}>Mật khẩu & xác thực</p>
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <SecurityItem icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>} title="Mật khẩu" desc="Cập nhật 3 tháng trước" action="Đổi" />
                <SecurityItem icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>} title="2FA" desc={me?.twoFactorEnabled ? "Đang bật" : "Chưa bật"} action={me?.twoFactorEnabled ? "Quản lý" : "Bật ngay"} />

                {sessions && sessions.length > 0 && (
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "#8694ad" }}>Phiên đang hoạt động</div>
                    <div className="space-y-2">
                      {sessions.slice(0, 2).map((s) => (
                        <div key={s.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                          <div className="min-w-0">
                            <div className="truncate text-xs font-medium" style={{ color: "#0f1729" }}>{s.deviceName || s.userAgent || "Thiết bị"}</div>
                            <div className="text-[10px]" style={{ color: "#8694ad" }}>{s.ipAddress || "—"}</div>
                          </div>
                          {s.isCurrent ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-600">Hiện tại</span> : <button disabled={revoking} onClick={() => revokeSession(s.id)} className="text-xs font-medium text-red-500 hover:text-red-600">Thu hồi</button>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/50 bg-white shadow-lg">
              <div className="border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4">
                <h3 className="font-bold" style={{ color: "#0f1729" }}>Tiếp tục thiết lập</h3>
              </div>
              <div className="p-4 space-y-2">
                <Link href="/profile" className="flex items-center justify-between rounded-xl border border-gray-100 p-3 transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <div>
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold uppercase" style={{ color: "#2a7bd9" }}>PROF</span>
                    <div className="mt-1 text-sm font-medium" style={{ color: "#0f1729" }}>Đổi hồ sơ khác</div>
                  </div>
                  <svg className="h-4 w-4" style={{ color: "#8694ad" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </Link>
                <Link href="/profile/preferences" className="flex items-center justify-between rounded-xl border border-gray-100 p-3 transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <div>
                    <div className="mt-1 text-sm font-medium" style={{ color: "#0f1729" }}>Tùy chọn du lịch</div>
                  </div>
                  <svg className="h-4 w-4" style={{ color: "#8694ad" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </Link>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-red-200 bg-red-50 shadow-lg">
              <div className="border-b border-red-100 bg-red-100/50 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-red-700">Vùng nguy hiểm</h3>
                    <p className="text-xs text-red-500">Hành động không thể hoàn tác</p>
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-2">
                <button type="button" disabled={!editing} onClick={() => alert("Đã gửi yêu cầu xuất dữ liệu đến email của bạn.")} className="flex w-full items-center justify-between rounded-lg border border-blue-200 bg-white px-4 py-2.5 text-left text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-60">
                  <span>Tải dữ liệu cá nhân</span>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </button>
                <button type="button" disabled={!editing} onClick={() => confirm("Bạn có chắc chắn muốn xóa tài khoản?") && alert("Đã gửi yêu cầu.")} className="flex w-full items-center justify-between rounded-lg border border-red-200 bg-white px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60">
                  <span>Xóa tài khoản</span>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {show2faModal && (
        <TwoFactorSetupModal onClose={() => setShow2faModal(false)} onEnabled={() => { setShow2faModal(false); }} />
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
