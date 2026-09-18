import Link from 'next/link';
import { LandingHeader } from '@/components/layout/landing-header';
import { HeroSearch } from '@/components/landing/hero-search';
import {
  Tent,
  Waves,
  Car,
  Backpack,
  Camera,
  Dumbbell,
  Bike,
  Sailboat,
  ShieldCheck,
  FileText,
  Banknote,
  Users,
  Star,
  Search,
  FileSignature,
  PackageCheck,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Globe,
  Phone,
  Mail,
} from 'lucide-react';

export const metadata = {
  title: 'FlexTrip — Thuê đồ du lịch linh hoạt',
  description:
    'Thuê thiết bị camping, trekking, phương tiện và trải nghiệm từ hàng nghìn provider uy tín tại Việt Nam.',
};

// ─── Data ────────────────────────────────────────────────────────────────────

// Category values must match ListingCategory enum in types/listing.ts
const CATEGORIES = [
  { icon: Tent, label: 'Cắm trại & Trekking', count: '240+ sản phẩm', slug: 'CAMPING_TREKKING' },
  { icon: Car, label: 'Phương tiện', count: '310+ sản phẩm', slug: 'VEHICLE' },
  { icon: Waves, label: 'Thể thao nước', count: '180+ sản phẩm', slug: 'STAY' },
  { icon: Camera, label: 'Nhiếp ảnh', count: '150+ sản phẩm', slug: 'EXPERIENCE' },
  { icon: Dumbbell, label: 'Thể thao', count: '200+ sản phẩm', slug: 'OTHER' },
  { icon: Backpack, label: 'Đồ du lịch', count: '420+ sản phẩm', slug: '' },
  { icon: Bike, label: 'Xe đạp', count: '95+ sản phẩm', slug: 'VEHICLE' },
  { icon: Sailboat, label: 'Thuyền & Biển', count: '60+ sản phẩm', slug: 'OTHER' },
];

const FEATURED_PRODUCTS = [
  {
    id: 1,
    name: 'Lều cắm trại 4 người Coleman',
    category: 'Cắm trại',
    price: 180000,
    rating: 4.9,
    reviews: 38,
    location: 'Đà Lạt',
    badge: 'Phổ biến nhất',
    gradient: 'from-emerald-400 to-teal-500',
    keyword: 'lều cắm trại',
  },
  {
    id: 2,
    name: 'Kayak đơn Intex Explorer',
    category: 'Thể thao nước',
    price: 250000,
    rating: 4.8,
    reviews: 24,
    location: 'Nha Trang',
    badge: 'Xu hướng',
    gradient: 'from-sky-400 to-blue-500',
    keyword: 'kayak',
  },
  {
    id: 3,
    name: 'Máy ảnh Sony A7III + ống kính',
    category: 'Nhiếp ảnh',
    price: 450000,
    rating: 5.0,
    reviews: 17,
    location: 'Hà Nội',
    badge: 'Đánh giá cao',
    gradient: 'from-purple-400 to-indigo-500',
    keyword: 'máy ảnh',
  },
  {
    id: 4,
    name: 'Xe đạp leo núi Trek Marlin',
    category: 'Xe đạp',
    price: 200000,
    rating: 4.7,
    reviews: 52,
    location: 'Hội An',
    badge: null,
    gradient: 'from-orange-400 to-red-500',
    keyword: 'xe đạp',
  },
  {
    id: 5,
    name: 'Bộ thiết bị lặn đầy đủ',
    category: 'Thể thao nước',
    price: 320000,
    rating: 4.9,
    reviews: 29,
    location: 'Phú Quốc',
    badge: 'Mới',
    gradient: 'from-cyan-400 to-blue-400',
    keyword: 'lặn biển',
  },
];

const STEPS = [
  {
    icon: Search,
    step: '01',
    title: 'Tìm & chọn',
    desc: 'Tìm kiếm theo địa điểm, ngày thuê và danh mục. Xem ảnh, mô tả chi tiết và đánh giá của người dùng trước.',
  },
  {
    icon: FileSignature,
    step: '02',
    title: 'Đặt & ký hợp đồng',
    desc: 'Đặt thuê trực tuyến, ký hợp đồng điện tử tự động, đặt cọc qua ví Escrow được bảo vệ an toàn.',
  },
  {
    icon: PackageCheck,
    step: '03',
    title: 'Nhận đồ',
    desc: 'Gặp Provider hoặc nhận qua nhân viên giao hàng FlexTrip. Xác nhận bằng mã QR, ghi nhận tình trạng.',
  },
  {
    icon: Star,
    step: '04',
    title: 'Trả & đánh giá',
    desc: 'Trả đồ đúng hạn, cọc được hoàn ngay. Để lại đánh giá giúp cộng đồng FlexTrip tốt hơn.',
  },
];

const TRUST_BADGES = [
  {
    icon: ShieldCheck,
    title: 'KYC Provider',
    desc: 'Mọi Provider đều qua xác minh danh tính, giảm rủi ro gian lận.',
    color: 'text-[#2A7BD9] bg-[#2A7BD9]/10',
  },
  {
    icon: FileText,
    title: 'Hợp đồng điện tử',
    desc: 'Hợp đồng pháp lý tự động ký số, bảo vệ quyền lợi cả hai bên.',
    color: 'text-emerald-600 bg-emerald-100',
  },
  {
    icon: Banknote,
    title: 'Cọc Escrow',
    desc: 'Tiền cọc giữ trung gian — hoàn tự động khi trả đồ đúng hạn.',
    color: 'text-amber-600 bg-amber-100',
  },
  {
    icon: Users,
    title: 'Nhân viên hỗ trợ',
    desc: 'Đội ngũ giao nhận FlexTrip hỗ trợ kiểm tra tình trạng sản phẩm.',
    color: 'text-purple-600 bg-purple-100',
  },
  {
    icon: ShieldCheck,
    title: 'Bảo hiểm sản phẩm',
    desc: 'Sản phẩm giá trị cao có thể đăng ký bảo hiểm, an tâm cho cả hai.',
    color: 'text-rose-600 bg-rose-100',
  },
];

const TESTIMONIALS = [
  {
    name: 'Minh Khoa',
    role: 'Traveler · Đà Nẵng',
    avatar: 'MK',
    rating: 5,
    text: 'Thuê lều và thiết bị cắm trại cho chuyến Đà Lạt cực kỳ dễ dàng. Hợp đồng điện tử ký xong trong 2 phút, đồ giao tận nơi đúng giờ. Sẽ dùng lại!',
  },
  {
    name: 'Thu Hương',
    role: 'Provider · Hà Nội',
    avatar: 'TH',
    rating: 5,
    text: 'Mình có 3 máy ảnh nhàn rỗi, đăng lên FlexTrip từ 3 tháng trước. Bây giờ mỗi tháng kiếm thêm được khoảng 4–5 triệu mà không cần làm gì thêm.',
  },
  {
    name: 'Trọng Nghĩa',
    role: 'Traveler · TP. HCM',
    avatar: 'TN',
    rating: 5,
    text: 'Tính năng escrow cọc là điểm mình thích nhất — không lo mất tiền oan. Provider cũng rất chuyên nghiệp, đồ chất lượng đúng như mô tả.',
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />

      {/* 1. Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0E2233] via-[#1a3a5c] to-[#2A7BD9]">
        <div className="pointer-events-none absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-[#92EEE8]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-[400px] w-[400px] rounded-full bg-[#2A7BD9]/20 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-20 sm:py-28 flex flex-col items-center text-center">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#92EEE8]/30 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#92EEE8] backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#92EEE8] animate-pulse" />
            Marketplace cho thuê đồ dùng du lịch #1 Việt Nam
          </span>

          <h1 className="max-w-4xl text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight text-white">
            Thuê đồ du lịch{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#92EEE8] to-[#60B4DD]">
              linh hoạt
            </span>
            ,{' '}
            <br className="hidden sm:block" />
            trải nghiệm{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#92EEE8] to-[#60B4DD]">
              đáng nhớ
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-base sm:text-lg text-white/70 leading-relaxed">
            Kết nối Traveler &amp; Provider — tìm lều, xe, máy ảnh và hàng nghìn thiết bị du lịch
            khác với hợp đồng điện tử, cọc Escrow và giao hàng tận nơi.
          </p>

          <div className="flex flex-wrap gap-6 mt-8 mb-10 justify-center">
            {[
              { value: '10,000+', label: 'Sản phẩm' },
              { value: '2,500+', label: 'Provider' },
              { value: '4.9★', label: 'Đánh giá TB' },
              { value: '50+', label: 'Tỉnh thành' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-white/60 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* HeroSearch writes to useSearchStore then navigates to /search */}
          <HeroSearch />
        </div>
      </section>

      {/* 2. Featured categories ─────────────────────────────────────────── */}
      <section id="categories" className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0E2233]">Danh mục nổi bật</h2>
            <p className="mt-3 text-[#5B7A93]">Khám phá hàng nghìn sản phẩm theo từng nhu cầu chuyến đi</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {CATEGORIES.map(({ icon: Icon, label, count, slug }) => (
              <Link
                key={label}
                href={`/search?category=${slug}`}
                className="group relative flex flex-col items-center gap-3 rounded-2xl border border-[#DCEFFB] bg-[#F6FBFE] p-5 text-center hover:border-[#2A7BD9]/40 hover:bg-white hover:-translate-y-1 hover:shadow-lg hover:shadow-[#2A7BD9]/10 transition-all duration-200"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2A7BD9]/10 to-[#92EEE8]/20 group-hover:from-[#2A7BD9]/20 group-hover:to-[#92EEE8]/30 transition-colors">
                  <Icon className="h-6 w-6 text-[#2A7BD9]" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-[#0E2233]">{label}</p>
                  <p className="text-xs text-[#5B7A93] mt-0.5">{count}</p>
                </div>
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="h-3.5 w-3.5 text-[#2A7BD9]" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Featured products ──────────────────────────────────────────── */}
      <section className="bg-[#F6FBFE] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-[#2A7BD9]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#2A7BD9]">
                  Xu hướng tuần này
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#0E2233]">Sản phẩm nổi bật</h2>
            </div>
            <Link
              href="/search"
              className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-[#2A7BD9] hover:text-[#1e5aa8] transition-colors"
            >
              Xem tất cả <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 sm:grid sm:grid-cols-3 lg:grid-cols-5 sm:overflow-visible sm:pb-0">
            {FEATURED_PRODUCTS.map((p) => (
              <Link
                key={p.id}
                href={`/search?keyword=${encodeURIComponent(p.keyword)}`}
                className="group shrink-0 w-64 sm:w-auto rounded-2xl bg-white border border-[#DCEFFB] overflow-hidden hover:shadow-xl hover:shadow-[#2A7BD9]/10 hover:-translate-y-1 transition-all duration-200"
              >
                <div className={`h-40 bg-gradient-to-br ${p.gradient} relative`}>
                  {p.badge && (
                    <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-bold text-[#0E2233] backdrop-blur-sm">
                      {p.badge}
                    </span>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-20">
                    <Backpack className="h-16 w-16 text-white" />
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5B7A93] mb-1">
                    {p.category} · {p.location}
                  </p>
                  <h3 className="text-sm font-semibold text-[#0E2233] leading-snug line-clamp-2 mb-2">
                    {p.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-base font-bold text-[#2A7BD9]">
                        {p.price.toLocaleString('vi-VN')}đ
                      </span>
                      <span className="text-xs text-[#5B7A93]">/ngày</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-medium text-[#0E2233]">{p.rating}</span>
                      <span className="text-xs text-[#5B7A93]">({p.reviews})</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-6 text-center sm:hidden">
            <Link href="/search" className="inline-flex items-center gap-2 text-sm font-medium text-[#2A7BD9]">
              Xem tất cả sản phẩm <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 4. How it works ───────────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0E2233]">Cách hoạt động</h2>
            <p className="mt-3 text-[#5B7A93] max-w-lg mx-auto">
              Từ tìm kiếm đến trả đồ — toàn bộ quy trình chỉ 4 bước đơn giản, hoàn toàn trực tuyến.
            </p>
          </div>

          <div className="relative">
            <div className="hidden lg:block absolute top-14 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-[#DCEFFB] via-[#2A7BD9]/30 to-[#DCEFFB]" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {STEPS.map(({ icon: Icon, step, title, desc }) => (
                <div key={step} className="relative flex flex-col items-center text-center group">
                  <div className="relative mb-5">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#2A7BD9] to-[#097DAE] flex items-center justify-center shadow-lg shadow-[#2A7BD9]/30 group-hover:shadow-xl transition-all">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-[#0E2233] text-white text-[10px] font-bold flex items-center justify-center">
                      {step}
                    </span>
                  </div>
                  <h3 className="font-bold text-[#0E2233] mb-2">{title}</h3>
                  <p className="text-sm text-[#5B7A93] leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. Trust & Safety ─────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-[#0E2233] to-[#1a3a5c] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#92EEE8]/30 bg-[#92EEE8]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#92EEE8] mb-4">
              <ShieldCheck className="h-3.5 w-3.5" />
              Tin cậy &amp; An toàn
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Được thiết kế để bạn yên tâm</h2>
            <p className="mt-3 text-white/60 max-w-lg mx-auto">
              Mỗi giao dịch trên FlexTrip đều được bảo vệ bởi hệ thống tin cậy nhiều lớp.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {TRUST_BADGES.map(({ icon: Icon, title, desc, color }) => (
              <div
                key={title}
                className="flex flex-col items-center text-center rounded-2xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 transition-colors"
              >
                <div className={`h-12 w-12 rounded-xl ${color} flex items-center justify-center mb-4`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-white mb-2 text-sm">{title}</h3>
                <p className="text-xs text-white/55 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Testimonials ───────────────────────────────────────────────── */}
      <section className="bg-[#F6FBFE] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0E2233]">Người dùng nói gì</h2>
            <p className="mt-3 text-[#5B7A93]">Hơn 8,000 đánh giá 5 sao từ cộng đồng FlexTrip</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="bg-white rounded-2xl border border-[#DCEFFB] p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-[#0E2233] leading-relaxed mb-6 italic">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#2A7BD9] to-[#92EEE8] flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0E2233]">{t.name}</p>
                    <p className="text-xs text-[#5B7A93]">{t.role}</p>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-[#2A7BD9] ml-auto shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Become a provider ──────────────────────────────────────────── */}
      <section id="become-provider" className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="rounded-3xl bg-gradient-to-br from-[#F6FBFE] to-[#C8EDFF]/40 border border-[#DCEFFB] overflow-hidden">
            <div className="flex flex-col lg:flex-row items-center gap-10 p-8 sm:p-12">
              <div className="flex-1">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#2A7BD9]/10 px-3 py-1 text-xs font-semibold text-[#2A7BD9] mb-4">
                  Dành cho Provider
                </span>
                <h2 className="text-3xl sm:text-4xl font-bold text-[#0E2233] mb-4">
                  Đồ nhàn rỗi? <br />Biến thành thu nhập.
                </h2>
                <p className="text-[#5B7A93] leading-relaxed mb-6 max-w-md">
                  Đăng ký Provider trên FlexTrip, cho thuê thiết bị du lịch bạn không dùng đến và
                  kiếm thêm thu nhập thụ động mỗi tháng — AI gợi ý giá thuê tối ưu theo thị trường.
                </p>
                <ul className="space-y-2.5 mb-8">
                  {[
                    'Đăng tin miễn phí, không giới hạn số lượng',
                    'AI tự động gợi ý giá thuê theo khu vực & mùa vụ',
                    'Hợp đồng điện tử & cọc Escrow bảo vệ tài sản',
                    'Nhân viên FlexTrip hỗ trợ giao nhận chuyên nghiệp',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-[#0E2233]">
                      <CheckCircle2 className="h-4 w-4 text-[#2A7BD9] mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/register?role=provider"
                    className="inline-flex items-center gap-2 rounded-full bg-[#2A7BD9] hover:bg-[#1e5aa8] text-white px-6 py-3 text-sm font-semibold transition-colors shadow-lg shadow-[#2A7BD9]/25"
                  >
                    Trở thành Provider <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="#how-it-works"
                    className="inline-flex items-center gap-2 rounded-full border border-[#2A7BD9]/30 text-[#2A7BD9] px-6 py-3 text-sm font-semibold hover:border-[#2A7BD9] hover:bg-[#2A7BD9]/5 transition-colors"
                  >
                    Tìm hiểu thêm
                  </Link>
                </div>
              </div>

              <div className="lg:shrink-0 grid grid-cols-2 gap-4 w-full lg:w-72">
                {[
                  { value: '4.2tr', label: 'Thu nhập TB / tháng', icon: Banknote },
                  { value: '2,500+', label: 'Provider hoạt động', icon: Users },
                  { value: '48h', label: 'Thời gian duyệt tin', icon: CheckCircle2 },
                  { value: '0đ', label: 'Phí đăng ký ban đầu', icon: Star },
                ].map(({ value, label, icon: Icon }) => (
                  <div key={label} className="rounded-2xl bg-white border border-[#DCEFFB] p-4 text-center shadow-sm">
                    <Icon className="h-5 w-5 text-[#2A7BD9] mx-auto mb-2" />
                    <p className="text-xl font-bold text-[#0E2233]">{value}</p>
                    <p className="text-xs text-[#5B7A93] mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Final CTA ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#2A7BD9] to-[#097DAE] py-16 sm:py-20">
        <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-[#92EEE8]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Sẵn sàng khám phá?</h2>
          <p className="text-white/75 mb-8 max-w-lg mx-auto">
            Tạo tài khoản miễn phí và bắt đầu thuê — hoặc cho thuê đồ — ngay hôm nay.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full bg-white text-[#2A7BD9] px-8 py-3.5 text-sm font-bold hover:bg-[#F1FAFF] transition-colors shadow-xl"
            >
              Đăng ký miễn phí <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 rounded-full border border-white/40 text-white px-8 py-3.5 text-sm font-semibold hover:bg-white/10 transition-colors"
            >
              Tìm kiếm ngay
            </Link>
          </div>
          <p className="mt-6 text-xs text-white/50">
            Không cần thẻ tín dụng · Đăng ký trong 2 phút · Hủy bất kỳ lúc nào
          </p>
        </div>
      </section>

      {/* 9. Footer ─────────────────────────────────────────────────────── */}
      <footer className="bg-[#0E2233] text-white/70">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#2A7BD9] to-[#92EEE8] flex items-center justify-center">
                  <span className="text-white font-bold text-sm">F</span>
                </div>
                <span className="font-bold text-lg text-white">FlexTrip</span>
              </div>
              <p className="text-sm leading-relaxed mb-4">
                Nền tảng cho thuê đồ dùng du lịch hàng đầu Việt Nam — kết nối Traveler &amp; Provider trên cả nước.
              </p>
              <div className="flex gap-3">
                {['F', 'I', 'T', 'Y'].map((s, i) => (
                  <a
                    key={i}
                    href="#"
                    className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs transition-colors"
                  >
                    {s}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4 text-sm">Công ty</h4>
              <ul className="space-y-2.5 text-sm">
                {['Về chúng tôi', 'Blog & Ưu đãi', 'Tuyển dụng', 'Báo chí'].map((item) => (
                  <li key={item}>
                    <a href="#" className="hover:text-white transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4 text-sm">Hỗ trợ</h4>
              <ul className="space-y-2.5 text-sm">
                {[
                  'Trung tâm trợ giúp',
                  'Chính sách hoàn/hủy',
                  'Điều khoản sử dụng',
                  'Chính sách bảo mật',
                  'Giải quyết tranh chấp',
                ].map((item) => (
                  <li key={item}>
                    <a href="#" className="hover:text-white transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4 text-sm">Liên hệ</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[#92EEE8] shrink-0" />
                  <a href="mailto:support@flextrip.vn" className="hover:text-white transition-colors">
                    support@flextrip.vn
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[#92EEE8] shrink-0" />
                  <span>1800 6789 (miễn phí)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Globe className="h-4 w-4 text-[#92EEE8] shrink-0 mt-0.5" />
                  <div className="flex gap-2">
                    <button className="hover:text-white transition-colors font-medium text-white">Tiếng Việt</button>
                    <span>·</span>
                    <button className="hover:text-white transition-colors">English</button>
                  </div>
                </li>
              </ul>
              <div className="mt-5 flex gap-2">
                <a href="#" className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-2 text-xs transition-colors">
                  App Store
                </a>
                <a href="#" className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-2 text-xs transition-colors">
                  Google Play
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/40">
            <p>© 2026 FlexTrip. Mọi quyền được bảo lưu.</p>
            <p>Giấy phép kinh doanh số 123456789 · Sở KHĐT TP. HCM</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
