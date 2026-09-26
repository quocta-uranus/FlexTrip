"use client";

import { useState, useEffect, useRef } from"react";
import { useRouter } from"next/navigation";
import Link from"next/link";
import {
  Card,
  SectionTitle,
  ProfileHeader,
  AvatarField,
  RoleBadge,
  KpiCards,
  Gallery,
  MapPreview,
  Field,
  Input,
  Select,
  ToggleRow,
  VerifyItem,
  SecurityItem,
  StickyCta,
} from"@/components/profile/ui";
import {
  Reveal,
  MagneticAvatar,
  Counter,
  LiveDot,
  ConfettiBurst,
  PulseDot,
  AnimatedGradientText,
  StickyEditBar,
  useConfetti,
} from"@/components/profile/wow";
import { useEditingProfile } from"@/hooks/useEditingProfile";
import { useProvidersProfile, useUpdateProviderProfile } from"@/hooks/useProvidersProfile";
import { useMe } from"@/hooks/useSession";
import { useSetAvatar } from"@/hooks/useSetAvatar";
import { useQueryClient } from"@tanstack/react-query";
import { Toast } from"@/components/ui/toast";
import type { ProviderProfile } from"@/lib/api/client";

interface ShopProfile {
  shopName: string;
  ownerName: string;
  email: string;
  phone: string;
  bio: string;
  avatar: string;
  category: string;
  pickupAddress: string;
  responseHours: string;
  languages: string[];
  itemsCount: number;
  rentalsCount: number;
  responseTimeH: number;
  rating: number;
  reviewsCount: number;
  highlights: string[];
  // TODO: fetch from API when BE supports listings
  featured: { title: string; price: string; rating: number; rentals: number; src: string }[];
  gallery: { src: string; caption?: string }[];
  notifyBooking: boolean;
  notifyMessage: boolean;
  notifyPayout: boolean;
}

function apiToForm(p: ProviderProfile | undefined): ShopProfile {
  if (!p) return buildEmpty();
  const cat = CATEGORY_MAP[p.category] ?? p.category;
  return {
    shopName: p.shopName,
    ownerName: p.ownerName,
    email: p.email,
    phone: p.phone ?? '',
    bio: p.bio ?? '',
    avatar: p.avatarUrl ?? '',
    category: cat,
    pickupAddress: p.pickupAddress,
    responseHours: p.responseHours,
    languages: ["Tiếng Việt","English"],
    itemsCount: p.itemsCount,
    rentalsCount: p.rentalsCount,
    responseTimeH: p.responseTimeH,
    rating: p.ratingAvg,
    reviewsCount: p.reviewsCount,
    highlights: p.highlights ?? [],
    featured: [
      { title:"Lều 4 người MSR Hubba", price:"250k/ngày", rating: 4.9, rentals: 56, src:"https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600" },
      { title:"Bộ nồi trekking MSR", price:"80k/ngày", rating: 4.8, rentals: 41, src:"https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=600" },
    ],
    gallery: [
      { src:"https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600", caption:"Lều Hubba" },
      { src:"https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=600", caption:"Bếp & nồi" },
      { src:"https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=600", caption:"Túi ngủ -5°C" },
      { src:"https://images.unsplash.com/photo-1487730116645-74489c95b41b?w=600", caption:"Bộ trekking pole" },
      { src:"https://images.unsplash.com/photo-1532339142463-fd0a8549791a?w=600", caption:"Ba lô 65L" },
      { src:"https://images.unsplash.com/photo-1455496231601-e6195da1f841?w=600", caption:"Đèn trekking" },
    ],
    notifyBooking: true,
    notifyMessage: true,
    notifyPayout: true,
  };
}

function buildEmpty(): ShopProfile {
  return {
    shopName:"", ownerName:"", email:"", phone:"",
    bio:"", avatar:"", category:"Phương tiện",
    pickupAddress:"", responseHours:"24 giờ",
    languages: ["Tiếng Việt"],
    itemsCount: 0, rentalsCount: 0, responseTimeH: 24,
    rating: 0, reviewsCount: 0, highlights: [],
    featured: [], gallery: [],
    notifyBooking: true, notifyMessage: true, notifyPayout: true,
  };
}

const CATEGORY_MAP: Record<string, string> = {
  CAMPING_TREKKING:"Camping & Trekking",
  VEHICLE:"Phương tiện",
  STAY:"Lưu trú",
  EXPERIENCE:"Trải nghiệm",
  OTHER:"Khác",
};
const CATEGORY_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_MAP).map(([k, v]) => [v, k]),
);

export default function ShopProfilePage() {
  const router = useRouter();
  const { data: me } = useMe();
  const { data: apiData, isLoading, error } = useProvidersProfile();
  // Bảo vệ route: chỉ PROVIDER mới được vào /profile/shop
  useEffect(() => {
    if (!me) return;
    const roles = (me.roles ?? []) as string[];
    if (!roles.includes('PROVIDER')) {
      router.replace(roles.includes('TRAVELER') ? '/profile/travel' : '/profile');
    }
  }, [me, router]);
  const { data: p, setData: setP, editing, setEditing, save, cancel, savedAt } =
    useEditingProfile<ShopProfile>("flextrip.profile.shop", buildEmpty());
  const [showSaved, setShowSaved] = useState(false);

  // Chỉ hiện toast khi savedAt thay đổi (tức save thật sự)
  useEffect(() => {
    if (!savedAt) return;
    setShowSaved(true);
    const timer = setTimeout(() => setShowSaved(false), 3000);
    return () => clearTimeout(timer);
  }, [savedAt]);

  const { mutateAsync: uploadAvatar, isPending: avatarUploading } = useSetAvatar();
  const { mutateAsync: updateProvider } = useUpdateProviderProfile();
  const qc = useQueryClient();
  const [showConfetti, setShowConfetti] = useState(false);
  const confetti = useConfetti(36);

  // Sync local state when API data loads
  useEffect(() => {
    if (apiData) {
      setP(apiToForm(apiData));
    }
  }, [apiData, setP]);

  const completion = computeCompletion(p);

  function update<K extends keyof ShopProfile>(k: K, v: ShopProfile[K]) {
    setP((s) => ({ ...s, [k]: v }));
  }
  function toggleHighlight(h: string) {
    setP((s) =>
      s.highlights.includes(h)
        ? { ...s, highlights: s.highlights.filter((x) => x !== h) }
        : { ...s, highlights: [...s.highlights, h] }
    );
  }
  async function handleSave() {
    try {
      await updateProvider({
        shopName: p.shopName,
        ownerName: p.ownerName,
        phone: p.phone || undefined,
        bio: p.bio || undefined,
        avatarUrl: p.avatar || undefined,
        category: CATEGORY_REVERSE[p.category] || p.category,
        pickupAddress: p.pickupAddress,
        responseHours: p.responseHours,
      });
      save();
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 1600);
    } catch (err) {
      console.error("Lưu thất bại:", err);
    }
  }

  return (
    <div className="pb-28">
      <ProfileHeader
        showCover
        eyebrow="PROVIDER"
        identityId="#FLX-SHOP-00219"
        roleBadge={<RoleBadge role="PROVIDER" />}
        name={p.shopName}
        subtitle={`Chủ shop: ${p.ownerName} · ${p.category} · 📍 ${p.pickupAddress}`}
        completion={completion}
        avatar={
          <div className="relative">
            <MagneticAvatar>
              <AvatarField
                name={p.shopName}
                value={p.avatar}
                uploading={avatarUploading}
                onUpload={async (file) => {
                  const url = await uploadAvatar(file);
                  qc.invalidateQueries({ queryKey: ['me'] });
                  qc.invalidateQueries({ queryKey: ['provider-profile'] });
                  return url;
                }}
                onChange={(v) => update("avatar", v)}
                disabled={!editing}
                size="lg"
              />
            </MagneticAvatar>
            {/* Live badge"LIVE" đập đỏ trên avatar shop */}
            <div className="absolute -bottom-2 -right-2">
              <LiveDot label="LIVE" tone="red" />
            </div>
          </div>
        }
        actions={
          !editing ? (
            <>
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-transform hover:scale-105"
                style={{ background:"#2a7bd9", boxShadow:"0 8px 20px -8px rgba(42,123,217,0.5)" }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Chỉnh sửa shop
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2.5 text-sm font-semibold dark:bg-[#121A2C] dark:text-white dark:border-white/10"
                style={{ borderColor:"#e2e8f3", color:"#2a7bd9" }}
              >
                💬 Chat Zalo
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-transform hover:scale-105"
                style={{ background:"#2a7bd9", boxShadow:"0 8px 20px -8px rgba(42,123,217,0.5)" }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Lưu
              </button>
              <button
                onClick={cancel}
                className="rounded-full border bg-white px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--surface-muted)] dark:bg-[#121A2C] dark:text-white dark:border-white/10"
                style={{ borderColor:"#e2e8f3" }}
              >
                Hủy
              </button>
            </>
          )
        }
      />

      {savedAt && (
        <div className="mx-auto mt-4 max-w-6xl px-6">
          <div
            className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm"
            style={{ borderColor:"rgba(146,238,232,0.4)", background:"rgba(146,238,232,0.15)", color:"#1e5aa8" }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Đã lưu hồ sơ shop lúc {savedAt}
          </div>
        </div>
      )}

      <section className="mx-auto mt-4 max-w-6xl px-6">
        <Reveal>
          <KpiCards
            items={[
              {
                label:"Đồ đang cho thuê",
                value: p.itemsCount,
                hint: `${p.featured.length} nổi bật`,
                valueNode: <Counter value={p.itemsCount} />,
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                ),
              },
              {
                label:"Lượt thuê",
                value: p.rentalsCount,
                hint:"tất cả thời gian",
                valueNode: <Counter value={p.rentalsCount} />,
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                ),
              },
              {
                label:"Phản hồi trung bình",
                value: `${p.responseTimeH}h`,
                hint:"98% trong 24h",
                valueNode: <><Counter value={p.responseTimeH} suffix="h" /></>,
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
              {
                label:"Đánh giá",
                value: `${p.rating.toFixed(1)} ⭐`,
                hint: `${p.reviewsCount} reviews`,
                valueNode: <><Counter value={p.rating} decimals={1} /> ⭐</>,
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.539 1.118l-3.36-2.448a1 1 0 00-1.176 0l-3.36 2.448c-.783.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
                  </svg>
                ),
              },
            ]}
          />
        </Reveal>
      </section>

      <section className="mx-auto mt-4 max-w-6xl px-6">
        <Reveal>
          <div className="flex flex-wrap gap-3 mb-2">
            <Link
              href="/dashboard/listings"
              className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all hover:shadow-md"
              style={{ borderColor: '#2a7bd9', color: '#2a7bd9', background: 'rgba(42,123,217,0.06)' }}
            >
              <span>📦</span> Quản lý sản phẩm
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all hover:shadow-md"
              style={{ borderColor: '#DCEFFB', color: '#5a6b85', background: '#fff' }}
            >
              <span>🏕️</span> Provider Dashboard
            </Link>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto mt-4 max-w-6xl px-6">
        <Reveal>
          <SectionTitle
            eyebrow={
              <span className="inline-flex items-center gap-1.5">
                <PulseDot color="#92eee8" size={6} />
                Why me
              </span>
            }
            title={<AnimatedGradientText>Tại sao chọn tôi</AnimatedGradientText>}
            desc="Các cam kết giúp traveler tin tưởng khi đặt thuê."
            action={
              editing && (
                <button
                  type="button"
                  className="text-xs font-semibold hover:underline"
                  style={{ color:"#2a7bd9" }}
                >
                  + Thêm cam kết
                </button>
              )
            }
          />
        </Reveal>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {p.highlights.map((h) => (
            <button
              key={h}
              onClick={() => editing && toggleHighlight(h)}
              disabled={!editing}
              className="flex w-full items-center gap-3 rounded-xl border p-4 text-left"
              style={{
                borderColor:"#92eee8",
                background:"rgba(146,238,232,0.18)",
                color:"#1e5aa8",
              }}
            >
              <span className="text-base font-semibold">{h}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-4 max-w-6xl px-6">
        <SectionTitle eyebrow="Gallery" title="Setup của tôi" desc="Ảnh thực tế đồ cho thuê tại shop." />
        <Gallery images={p.gallery} total={p.gallery.length} />
      </section>

      <section className="mx-auto mt-4 grid max-w-6xl gap-6 px-6 lg:grid-cols-3">
        <Card title="Thông tin shop" subtitle="PROF-01 (Provider)" className="lg:col-span-2">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Tên shop" required>
              <Input value={p.shopName} onChange={(v) => update("shopName", v)} disabled={!editing} />
            </Field>
            <Field label="Chủ shop" required>
              <Input value={p.ownerName} onChange={(v) => update("ownerName", v)} disabled={!editing} />
            </Field>
            <Field label="Email liên hệ" required>
              <Input type="email" value={p.email} onChange={(v) => update("email", v)} disabled={!editing} />
            </Field>
            <Field label="Số điện thoại / Zalo" required>
              <Input value={p.phone} onChange={(v) => update("phone", v)} disabled={!editing} />
            </Field>
            <Field label="Danh mục chính" full>
              <Select
                value={p.category}
                onChange={(v) => update("category", v)}
                disabled={!editing}
                options={[
                  { value:"Camping & Trekking", label:"Camping & Trekking" },
                  { value:"Phương tiện", label:"Phương tiện (xe máy, ô tô)" },
                  { value:"Lưu trú", label:"Lưu trú (homestay, villa)" },
                  { value:"Trải nghiệm", label:"Trải nghiệm (tour, workshop)" },
                  { value:"Khác", label:"Khác" },
                ]}
              />
            </Field>
            <Field label="Điểm giao nhận" full>
              <Input
                value={p.pickupAddress}
                onChange={(v) => update("pickupAddress", v)}
                disabled={!editing}
                icon={
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
              />
            </Field>
            <Field label="Cam kết phản hồi" full>
              <Input value={`${p.responseHours}`} onChange={(v) => update("responseHours", v)} disabled={!editing} placeholder="VD: 2 giờ" />
            </Field>
            <Field label="Mô tả shop" full>
              <textarea
                value={p.bio}
                disabled={!editing}
                onChange={(e) => update("bio", e.target.value)}
                rows={4}
                className="w-full rounded-lg border bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 disabled:bg-[var(--surface-muted)] dark:bg-[#121A2C] dark:text-white dark:border-white/10"
                style={{ borderColor:"#e2e8f3" }}
              />
            </Field>
          </div>
        </Card>

        <Card title="Xác minh (KYC)" subtitle="AUTH-05 — cần hoàn tất để rút tiền" accent>
          <VerifyItem label="CCCD / CMND" done />
          <VerifyItem label="Xác minh khuôn mặt" done />
          <VerifyItem label="Số tài khoản ngân hàng" />
          <VerifyItem label="Mã số thuế (tuỳ chọn)" />
          <div className="mt-4 rounded-lg border border-dashed p-3 text-xs" style={{ borderColor:"#92eee8", background:"rgba(146,238,232,0.15)", color:"#1e5aa8" }}>
            Hoàn tất KYC để tăng giới hạn rút tiền lên <strong>50M VND/ngày</strong>.
          </div>
        </Card>

        <Card title="Đồ cho thuê nổi bật" subtitle="Top 2 theo lượt thuê" className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            {p.featured.map((it) => (
              <div
                key={it.title}
                className="overflow-hidden rounded-xl border"
                style={{ borderColor:"#e2e8f3" }}
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-[var(--surface-muted)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.src} alt={it.title} className="h-full w-full object-cover" />
                  <div className="absolute right-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-bold dark:bg-[#121A2C] dark:text-white" style={{ color:"#2a7bd9" }}>
                    ⭐ {it.rating.toFixed(1)}
                  </div>
                </div>
                <div className="p-3">
                  <div className="text-sm font-semibold">{it.title}</div>
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                    <span>{it.rentals} lượt thuê</span>
                    <span className="font-bold" style={{ color:"#2a7bd9" }}>{it.price}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold"
            style={{ color:"#2a7bd9" }}
          >
            Xem tất cả {p.itemsCount} đồ đang cho thuê →
          </button>
        </Card>

        <Card title="Khu vực giao nhận" subtitle="Bán kính giao trong Đà Nẵng">
          <MapPreview label="Điểm giao nhận" address={p.pickupAddress} lat={16.054} lng={108.202} />
        </Card>

        <Card title="Thông báo shop" subtitle="Cảnh báo booking, tin nhắn, payout" className="lg:col-span-2">
          <ToggleRow label="Booking mới" desc="Push & email khi có yêu cầu thuê" value={p.notifyBooking} onChange={(v) => update("notifyBooking", v)} disabled={!editing} />
          <ToggleRow label="Tin nhắn traveler" desc="Âm thanh & badge khi có tin nhắn mới" value={p.notifyMessage} onChange={(v) => update("notifyMessage", v)} disabled={!editing} />
          <ToggleRow label="Payout / rút tiền" desc="Thông báo khi tiền về tài khoản" value={p.notifyPayout} onChange={(v) => update("notifyPayout", v)} disabled={!editing} />
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
              desc="Cập nhật lần cuối 30 ngày trước"
              action="Đổi"
            />
            <SecurityItem
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              }
              title="2FA — bắt buộc với shop"
              desc="Đang bật — Authenticator"
              action="Quản lý"
            />
            <SecurityItem
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              }
              title="Payout method"
              desc="Vietcombank ••• 4477"
              action="Đổi"
            />
          </div>
        </Card>
      </section>

      <StickyCta primary={{ label:"📅 Quản lý lịch trống" }} secondary={{ label:"💬 Chat Zalo" }} />
      <StickyEditBar visible={editing} savedAt={savedAt} onSave={handleSave} onCancel={cancel} brand="#2a7bd9" />
      {showConfetti && <ConfettiBurst pieces={confetti} />}
      <Toast show={showSaved} message="Đã lưu hồ sơ thành công!" onClose={() => setShowSaved(false)} />
    </div>
  );
}

function computeCompletion(p: ShopProfile): number {
  const checks: boolean[] = [
    Boolean(p.shopName.trim()),
    Boolean(p.ownerName.trim()),
    /^\S+@\S+\.\S+$/.test(p.email),
    Boolean(p.phone.trim()),
    Boolean(p.pickupAddress.trim()),
    Boolean(p.category),
    Boolean(p.bio.trim()) && p.bio.length >= 50,
    Boolean(p.avatar),
    p.highlights.length >= 3,
    p.gallery.length >= 5,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
