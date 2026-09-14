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
  BadgeRow,
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
  Reveal,
  MagneticAvatar,
  Counter,
  ConfettiBurst,
  SparkleBadge,
  PulseDot,
  AnimatedGradientText,
  EditingBanner,
  StickyEditBar,
  useConfetti,
} from "@/components/profile/wow";
import { useEditingProfile } from "@/hooks/useEditingProfile";

/**
 * /profile/travel — Travel profile (Traveler).
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
  tripType: "leisure" | "business" | "trekking" | "mixed" | "";
  budgetMin: string;
  budgetMax: string;
  tripsCount: number;
  rating: number;
  reviewsGiven: number;
  emailNotifications: boolean;
  smsNotifications: boolean;
  marketingEmails: boolean;
}

const initialProfile: TravelProfile = {
  fullName: "Nguyễn Minh Anh",
  email: "minhanh@gmail.com",
  phone: "+84 912 345 678",
  dateOfBirth: "1998-04-12",
  gender: "female",
  nationality: "Việt Nam",
  address: "Quận 1, TP. Hồ Chí Minh",
  bio: "Yêu thích khám phá văn hóa bản địa và du lịch trải nghiệm.",
  avatar: "",
  emergencyContact: "Nguyễn Văn A — +84 987 654 321",
  languages: ["Tiếng Việt", "English"],
  tripType: "trekking",
  budgetMin: "500000",
  budgetMax: "2000000",
  tripsCount: 7,
  rating: 5.0,
  reviewsGiven: 12,
  emailNotifications: true,
  smsNotifications: false,
  marketingEmails: true,
};

const ALL_LANGUAGES = ["Tiếng Việt", "English", "中文", "日本語", "한국어", "Français"];

export default function TravelProfilePage() {
  const { data: p, setData: setP, editing, setEditing, save, cancel, savedAt, reset } =
    useEditingProfile<TravelProfile>("flextrip.profile.travel", initialProfile);
  const [showConfetti, setShowConfetti] = useState(false);
  const confetti = useConfetti(36);

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
  function handleSave() {
    save();
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 1600);
  }

  const tripTimeline = [
    { date: "T8/2026", title: "Thuê lều ở Sơn Trà", subtitle: "Minhan Outdoor Gear · 3 ngày", badge: "Treks" },
    { date: "T6/2026", title: "Trekking Bà Nà Hills", subtitle: "Klook FlexTrip · 1 ngày", badge: "Day-trip" },
    { date: "T4/2026", title: "Camping Cù Lao Chàm", subtitle: "HaiAn Camping · 2 ngày", badge: "Camp" },
    { date: "T2/2026", title: "City tour Đà Nẵng", subtitle: "FlexTrip Verified · nửa ngày", badge: "City" },
  ];

  const trips = p.tripsCount;
  const badges = [
    { name: "Newbie Trekker", desc: "Hoàn thành 1–3 chuyến thuê", level: trips >= 1 ? ("done" as const) : ("locked" as const) },
    { name: "Explorer", desc: "Hoàn thành 4–9 chuyến thuê", level: trips >= 4 ? ("done" as const) : trips >= 1 ? ("current" as const) : ("locked" as const) },
    { name: "Pro Trekker", desc: "Hoàn thành 10+ chuyến thuê", level: trips >= 10 ? ("done" as const) : trips >= 4 ? ("current" as const) : ("locked" as const) },
  ];

  return (
    <div className="pb-28">
      <ProfileHeader
        showCover
        eyebrow="TRAVELER"
        identityId="#FLX-20250048"
        roleBadge={<RoleBadge role="TRAVELER" />}
        name={p.fullName}
        subtitle={`${p.email} · ${p.address}`}
        completion={completion}
        avatar={
          <MagneticAvatar>
            <AvatarField
              name={p.fullName}
              value={p.avatar}
              onChange={(v) => update("avatar", v)}
              disabled={!editing}
            />
          </MagneticAvatar>
        }
        actions={
          !editing ? (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-transform hover:scale-105"
              style={{ background: "#2a7bd9", boxShadow: "0 8px 20px -8px rgba(42,123,217,0.5)" }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Chỉnh sửa
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-transform hover:scale-105"
                style={{ background: "#2a7bd9", boxShadow: "0 8px 20px -8px rgba(42,123,217,0.5)" }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Lưu thay đổi
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

      {savedAt && !editing && (
        <div className="mx-auto max-w-6xl px-6">
          <div
            className="mt-3 flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm"
            style={{ borderColor: "rgba(146,238,232,0.4)", background: "rgba(146,238,232,0.15)", color: "#1e5aa8" }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Đã lưu hồ sơ lúc {savedAt} — tuyệt vời!
          </div>
        </div>
      )}

      <section className="mx-auto mt-4 max-w-6xl px-6">
        <Reveal>
          <KpiCards
            items={[
            {
              label: "Chuyến thuê",
              value: p.tripsCount,
              hint: "+2 tháng này",
              valueNode: <Counter value={p.tripsCount} />,
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              ),
            },
            {
              label: "Đánh giá trung bình",
              value: `${p.rating.toFixed(1)} ⭐`,
              hint: "Traveler rating",
              valueNode: <><Counter value={p.rating} decimals={1} /> ⭐</>,
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.539 1.118l-3.36-2.448a1 1 0 00-1.176 0l-3.36 2.448c-.783.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
                </svg>
              ),
            },
            {
              label: "Reviews để lại",
              value: p.reviewsGiven,
              hint: "12 Provider",
              valueNode: <Counter value={p.reviewsGiven} />,
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              ),
            },
            {
              label: "Ngân sách/chuyến",
              value: formatVndRange(p.budgetMin, p.budgetMax),
              hint: "Cập nhật gần nhất",
              valueNode: <span className="text-base font-bold">{formatVndRange(p.budgetMin, p.budgetMax)}</span>,
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
            },
            ]}
          />
        </Reveal>
      </section>

      <section className="mx-auto mt-4 max-w-6xl px-6">
        <Reveal>
          <SectionTitle
            eyebrow={
              <span className="inline-flex items-center gap-1.5">
                <PulseDot color="#92eee8" size={6} />
                Achievement
              </span>
            }
            title={
              <AnimatedGradientText>Huy hiệu của bạn</AnimatedGradientText>
            }
            desc="Mở khóa theo số chuyến thuê hoàn thành."
          />
        </Reveal>
        <Reveal delay={120}>
          <BadgeRowWithSparkle badges={badges} />
        </Reveal>
      </section>

      <section className="mx-auto mt-4 grid max-w-6xl gap-6 px-6 lg:grid-cols-3">
        <Card title="Thông tin cá nhân" subtitle="Thông tin cơ bản về bạn" className="lg:col-span-2">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Họ và tên" required>
              <Input value={p.fullName} onChange={(v) => update("fullName", v)} disabled={!editing} />
            </Field>
            <Field label="Email" required>
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
            <Field label="Số điện thoại" required>
              <Input value={p.phone} onChange={(v) => update("phone", v)} disabled={!editing} />
            </Field>
            <Field label="Ngày sinh">
              <Input type="date" value={p.dateOfBirth} onChange={(v) => update("dateOfBirth", v)} disabled={!editing} />
            </Field>
            <Field label="Giới tính">
              <Select
                value={p.gender}
                onChange={(v) => update("gender", v as TravelProfile["gender"])}
                disabled={!editing}
                options={[
                  { value: "", label: "Chọn giới tính" },
                  { value: "female", label: "Nữ" },
                  { value: "male", label: "Nam" },
                  { value: "other", label: "Khác" },
                ]}
              />
            </Field>
            <Field label="Quốc tịch">
              <Input value={p.nationality} onChange={(v) => update("nationality", v)} disabled={!editing} />
            </Field>
            <Field label="Địa chỉ" full>
              <Input value={p.address} onChange={(v) => update("address", v)} disabled={!editing} />
            </Field>
            <Field label="Giới thiệu bản thân" full>
              <textarea
                value={p.bio}
                disabled={!editing}
                onChange={(e) => update("bio", e.target.value)}
                rows={3}
                placeholder="Một vài dòng giới thiệu về bạn..."
                className="w-full rounded-lg border bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 disabled:bg-[var(--surface-muted)] disabled:text-text-muted"
                style={{ borderColor: "#e2e8f3" }}
              />
            </Field>
          </div>
        </Card>

        <Card title="Tùy chọn du lịch" subtitle="PROF-02" accent>
          <div className="space-y-4">
            <Field label="Loại chuyến">
              <Select
                value={p.tripType}
                onChange={(v) => update("tripType", v as TravelProfile["tripType"])}
                disabled={!editing}
                options={[
                  { value: "", label: "Chọn loại chuyến" },
                  { value: "leisure", label: "Nghỉ dưỡng" },
                  { value: "business", label: "Công tác" },
                  { value: "trekking", label: "Trekking / Outdoor" },
                  { value: "mixed", label: "Kết hợp" },
                ]}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ngân sách min (VND)">
                <Input type="number" value={p.budgetMin} onChange={(v) => update("budgetMin", v)} disabled={!editing} />
              </Field>
              <Field label="Ngân sách max (VND)">
                <Input type="number" value={p.budgetMax} onChange={(v) => update("budgetMax", v)} disabled={!editing} />
              </Field>
            </div>
            <p className="text-xs" style={{ color: "#5a6b85" }}>
              Dùng để gợi ý listing phù hợp trong AIREC.
            </p>
          </div>
        </Card>

        <Card title="Hành trình gần đây" subtitle="Lịch sử các chuyến thuê" className="lg:col-span-2">
          <Timeline items={tripTimeline} />
        </Card>

        <Card title="Ngôn ngữ" subtitle="Ngôn ngữ bạn có thể giao tiếp">
          <div className="flex flex-wrap gap-2">
            {ALL_LANGUAGES.map((lang) => {
              const active = p.languages.includes(lang);
              return (
                <button
                  key={lang}
                  onClick={() => editing && toggleLanguage(lang)}
                  disabled={!editing}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium ${!editing ? "cursor-default" : "cursor-pointer"}`}
                  style={
                    active
                      ? { borderColor: "#2a7bd9", background: "#2a7bd9", color: "white" }
                      : { borderColor: "#e2e8f3", background: "white", color: "#0f1729" }
                  }
                >
                  {active && (
                    <svg className="mr-1 inline h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {lang}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs" style={{ color: "#8694ad" }}>
            Đã chọn {p.languages.length} ngôn ngữ
          </p>
        </Card>

        <Card title="Xác minh danh tính" subtitle="Tăng độ tin cậy">
          <VerifyItem label="Email" done />
          <VerifyItem label="Số điện thoại" done />
          <VerifyItem label="CMND / CCCD" />
          <VerifyItem label="Xác minh khuôn mặt" />
        </Card>

        <Card title="Thông báo" subtitle="Chọn cách chúng tôi liên lạc" className="lg:col-span-2">
          <ToggleRow label="Email thông báo" desc="Đặt thuê, nhắc lịch, cập nhật quan trọng" value={p.emailNotifications} onChange={(v) => update("emailNotifications", v)} disabled={!editing} />
          <ToggleRow label="SMS thông báo" desc="OTP và cảnh báo bảo mật" value={p.smsNotifications} onChange={(v) => update("smsNotifications", v)} disabled={!editing} />
          <ToggleRow label="Email marketing" desc="Ưu đãi và gợi ý chuyến đi" value={p.marketingEmails} onChange={(v) => update("marketingEmails", v)} disabled={!editing} />
        </Card>

        <Card title="Bảo mật" subtitle="Mật khẩu & xác thực" className="lg:col-span-3">
          <div className="grid gap-6 sm:grid-cols-3">
            <SecurityItem
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
              title="Mật khẩu"
              desc="Cập nhật lần cuối 3 tháng trước"
              action="Đổi"
            />
            <SecurityItem
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              }
              title="Xác thực 2 bước (2FA)"
              desc="Đang bật — qua Authenticator"
              action="Quản lý"
            />
            <SecurityItem
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
              title="Liên hệ khẩn cấp"
              desc={p.emergencyContact || "Chưa cập nhật"}
              action="Sửa"
            />
          </div>
        </Card>

        <Card title="Vùng nguy hiểm" subtitle="Các hành động không thể hoàn tác" className="lg:col-span-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={!editing}
              onClick={() => alert("Đã gửi yêu cầu xuất dữ liệu đến email của bạn.")}
              className="rounded-lg border px-4 py-2.5 text-left text-sm font-medium hover:bg-[var(--surface-muted)] disabled:opacity-60"
              style={{ borderColor: "rgba(42,123,217,0.4)", color: "#2a7bd9" }}
            >
              <div className="font-semibold">Xuất dữ liệu cá nhân</div>
              <div className="mt-0.5 text-xs" style={{ color: "#5a6b85" }}>Tải về bản sao hồ sơ của bạn (GDPR)</div>
            </button>
            <button
              type="button"
              disabled={!editing}
              onClick={() => confirm("Bạn có chắc chắn muốn xóa tài khoản?") && alert("Đã gửi yêu cầu xóa tài khoản.")}
              className="rounded-lg border border-red-200 px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              <div className="font-semibold">Xóa tài khoản</div>
              <div className="mt-0.5 text-xs text-red-400/80">Tài khoản sẽ bị xóa vĩnh viễn sau 30 ngày</div>
            </button>
          </div>
        </Card>
      </section>

      <section className="mx-auto mt-4 max-w-6xl px-6">
        <div className="rounded-2xl border bg-white p-6" style={{ borderColor: "#e2e8f3" }}>
          <h3 className="mb-1 text-lg font-semibold">Tiếp tục thiết lập</h3>
          <p className="mb-5 text-sm" style={{ color: "#5a6b85" }}>Hoàn thiện hồ sơ để có trải nghiệm tốt nhất</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { code: "PROF", title: "Đổi sang hồ sơ khác", href: "/profile" },
              { code: "PROF-02", title: "Tùy chọn du lịch", href: "/profile/preferences" },
            ].map((q) => (
              <Link
                key={q.code}
                href={q.href}
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

      <StickyCta primary={{ label: "💬 Chat với CSKH" }} secondary={{ label: "📅 Đặt chuyến mới" }} />

      <StickyEditBar visible={editing} onSave={handleSave} onCancel={cancel} brand="#2a7bd9" />
      {showConfetti && <ConfettiBurst pieces={confetti} />}
    </div>
  );
}

/** Travel-specific: bọc SparkleBadge quanh badge đã đạt */
function BadgeRowWithSparkle({
  badges,
}: {
  badges: { name: string; level: "locked" | "current" | "done"; desc: string }[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {badges.map((b) => {
        const inner = <BadgeRowBadge badge={b} />;
        return b.level === "done" ? <SparkleBadge key={b.name}>{inner}</SparkleBadge> : <div key={b.name}>{inner}</div>;
      })}
    </div>
  );
}

function BadgeRowBadge({ badge: b }: { badge: { name: string; level: "locked" | "current" | "done"; desc: string } }) {
  const tone =
    b.level === "done"
      ? { bg: "linear-gradient(135deg,#92eee8,#5fd6cd)", fg: "#0f1729", border: "#5fd6cd" }
      : b.level === "current"
      ? { bg: "rgba(42,123,217,0.1)", fg: "#2a7bd9", border: "#2a7bd9" }
      : { bg: "#f1f5fa", fg: "#8694ad", border: "#e2e8f3" };
  return (
    <div
      className="rounded-xl border-2 p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
      style={{ borderColor: tone.border, background: tone.bg }}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: "white", color: tone.fg }}>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="text-sm font-bold" style={{ color: tone.fg }}>
          {b.name}
        </div>
      </div>
      <div className="mt-2 text-xs" style={{ color: tone.fg }}>
        {b.desc}
      </div>
      {b.level === "current" && (
        <div className="mt-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: tone.fg }}>
          Đang theo đuổi
        </div>
      )}
      {b.level === "done" && (
        <div className="mt-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: tone.fg }}>
          ✓ Đã đạt
        </div>
      )}
      {b.level === "locked" && (
        <div className="mt-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#8694ad" }}>
          🔒 Chưa mở khóa
        </div>
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
    Boolean(p.tripType),
    Boolean(p.budgetMin) && Boolean(p.budgetMax),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function formatVndRange(min: string, max: string) {
  const mn = Number(min);
  const mx = Number(max);
  if (!mn || !mx) return "—";
  if (mn >= 1_000_000) return `${(mn / 1_000_000).toFixed(0)}–${(mx / 1_000_000).toFixed(0)}M`;
  if (mn >= 1_000) return `${(mn / 1_000).toFixed(0)}–${(mx / 1_000).toFixed(0)}k`;
  return `${mn}–${mx}`;
}
