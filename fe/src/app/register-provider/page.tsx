'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LandingHeader } from '@/components/layout/landing-header';
import { providerApplicationApi } from '@/lib/api/client';
import { LISTING_CATEGORIES } from '@/constants/categories';

const CATEGORIES = LISTING_CATEGORIES.map((c) => ({ value: c.value, label: c.label, icon: c.emoji }));

const CITIES = [
  'TP. Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Đà Lạt', 'Nha Trang',
  'Hội An', 'Huế', 'Hải Phòng', 'Cần Thơ', 'Quy Nhơn', 'Phan Thiết', 'Vũng Tàu', 'Khác',
];

const WHY_CARDS = [
  { icon: '💰', title: 'Thu nhập thụ động', desc: 'Biến đồ nhàn rỗi thành 2–15 triệu/tháng mà không cần làm thêm gì.' },
  { icon: '⚡', title: 'Đăng tin trong 10 phút', desc: 'Quy trình đơn giản — FlexTrip duyệt tin trong vòng 48 giờ làm việc.' },
  { icon: '🗓️', title: 'Toàn quyền kiểm soát', desc: 'Bạn tự đặt giá, lịch cho thuê và điều khoản giao nhận riêng.' },
  { icon: '🛡️', title: 'Bảo vệ tài sản', desc: 'Hợp đồng điện tử + cọc Escrow giữ tiền an toàn trước mỗi giao dịch.' },
  { icon: '🤖', title: 'AI gợi ý giá tối ưu', desc: 'Hệ thống AI phân tích nhu cầu thị trường và đề xuất mức giá cạnh tranh nhất.' },
  { icon: '🙋', title: 'Hỗ trợ tận tâm', desc: 'Đội ngũ FlexTrip tư vấn kinh nghiệm & hỗ trợ chụp ảnh, định giá cho bạn.' },
];

const INCOME_TABLE = [
  { cat: '⛺ Cắm trại & Trekking', income: '2 – 5 triệu', days: '8 – 15 ngày' },
  { cat: '🚵 Phương tiện (xe máy, xe đạp)', income: '3 – 8 triệu', days: '10 – 20 ngày' },
  { cat: '🏡 Lưu trú (homestay, villa)', income: '5 – 15 triệu', days: '6 – 18 ngày' },
  { cat: '🌄 Trải nghiệm & Tour', income: '4 – 10 triệu', days: '8 – 16 ngày' },
  { cat: '📦 Đồ dùng khác', income: '1 – 4 triệu', days: '5 – 12 ngày' },
];

const STEPS = [
  {
    step: '1', icon: '📝',
    title: 'Điền thông tin đăng ký',
    desc: 'Hoàn thành form bên dưới trong 5 phút. FlexTrip sẽ liên hệ lại trong vòng 1 ngày làm việc.',
  },
  {
    step: '2', icon: '🤝',
    title: 'Tư vấn & xác nhận',
    desc: 'Nhân viên FlexTrip liên hệ tư vấn quy trình, hỗ trợ chụp ảnh và định giá đồ cho thuê.',
  },
  {
    step: '3', icon: '🚀',
    title: 'Đăng tin & bắt đầu kiếm tiền',
    desc: 'Tin được duyệt trong 48h. Nhận booking và thu nhập ngay từ đồ bạn đang có!',
  },
];

export default function RegisterProviderPage() {
  const [showModal, setShowModal] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', city: '',
    categories: [] as string[],
    description: '',
  });

  function update(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function toggleCategory(val: string) {
    setForm((f) =>
      f.categories.includes(val)
        ? { ...f, categories: f.categories.filter((c) => c !== val) }
        : { ...f, categories: [...f.categories, val] }
    );
  }
  function openModal() { setShowModal(true); setSubmitted(false); setSubmitError(null); }
  function closeModal() { setShowModal(false); }
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.categories.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await providerApplicationApi.submit({
        name: form.name,
        phone: form.phone,
        email: form.email,
        city: form.city,
        categories: form.categories,
        description: form.description || undefined,
      });
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.';
      setSubmitError(msg.includes('đang chờ') ? msg : 'Đã có lỗi xảy ra. Vui lòng thử lại sau.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#f6fbfe' }}>
      <LandingHeader />

      {/* ── HERO ── */}
      <section
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f1729 0%, #1a3f7a 45%, #2a7bd9 100%)' }}
      >
        <div className="pointer-events-none absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full blur-3xl" style={{ background: 'rgba(146,238,232,0.12)' }} />
        <div className="pointer-events-none absolute -bottom-20 left-0 h-64 w-64 rounded-full blur-3xl" style={{ background: 'rgba(42,123,217,0.25)' }} />

        <div className="relative mx-auto max-w-6xl px-6 py-20 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">

            {/* Card trắng bên trái */}
            <div className="rounded-3xl bg-white p-8 shadow-2xl sm:p-10">
              <span
                className="mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider"
                style={{ background: 'rgba(42,123,217,0.1)', color: '#2a7bd9' }}
              >
                Dành cho Provider
              </span>
              <h1 className="mb-4 text-3xl font-bold leading-tight sm:text-4xl" style={{ color: '#0f1729' }}>
                Cho thuê đồ trên{' '}
                <span style={{ color: '#2a7bd9' }}>FlexTrip</span>{' '}
                để tăng thu nhập thụ động!
              </h1>
              <p className="mb-2 text-sm leading-relaxed" style={{ color: '#5a6b85' }}>
                FlexTrip không thu phí đăng ký. Bạn chỉ chia sẻ phí dịch vụ khi có giao dịch cho thuê thành công.
              </p>
              <div className="my-5 border-t" style={{ borderColor: '#e2e8f3' }} />
              <p className="mb-6 text-sm" style={{ color: '#5a6b85' }}>
                Hỗ trợ:{' '}
                <strong style={{ color: '#0f1729' }}>support@flextrip.vn</strong>
                <br />
                Hoặc nhắn tin qua Fanpage FlexTrip
              </p>
              <button
                onClick={openModal}
                className="w-full rounded-2xl py-4 text-base font-bold text-white transition-all hover:scale-[1.02] hover:shadow-xl active:scale-100"
                style={{
                  background: 'linear-gradient(135deg, #1e5aa8, #2a7bd9)',
                  boxShadow: '0 8px 24px -8px rgba(42,123,217,0.55)',
                }}
              >
                Đăng ký ngay →
              </button>
            </div>

            {/* Stats bên phải */}
            <div className="flex flex-col gap-6">
              <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
                Kiếm thêm thu nhập từ đồ bạn đang có
              </h2>
              <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
                Hàng trăm provider đang kiếm từ{' '}
                <strong className="text-white">2 – 15 triệu/tháng</strong>{' '}
                từ thiết bị camping, xe, homestay và trải nghiệm độc đáo trên FlexTrip.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: '500+', label: 'Provider đang hoạt động' },
                  { value: '4.2tr', label: 'Thu nhập trung bình / tháng' },
                  { value: '0đ', label: 'Phí đăng ký ban đầu' },
                  { value: '48h', label: 'Thời gian duyệt tin' },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-2xl border p-5 backdrop-blur-sm"
                    style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.15)' }}
                  >
                    <p className="text-2xl font-bold text-white">{s.value}</p>
                    <p className="mt-1 text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TẠI SAO NÊN LÀ PROVIDER ── */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold" style={{ color: '#0f1729' }}>
              Tại sao nên là Provider trên FlexTrip?
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {WHY_CARDS.map((card) => (
              <div
                key={card.title}
                className="flex gap-4 rounded-2xl border bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-lg"
                style={{ borderColor: '#DCEFFB' }}
              >
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
                  style={{ background: 'rgba(42,123,217,0.08)' }}
                >
                  {card.icon}
                </div>
                <div>
                  <h3 className="mb-1.5 font-bold" style={{ color: '#0f1729' }}>{card.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#5a6b85' }}>{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── THU NHẬP ƯỚC TÍNH ── */}
      <section className="border-t border-b py-20" style={{ borderColor: '#DCEFFB', background: '#fff' }}>
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-3 text-center">
            <h2 className="text-3xl font-bold" style={{ color: '#0f1729' }}>
              Thu nhập ước tính theo danh mục
            </h2>
            <p className="mt-3 text-sm" style={{ color: '#5a6b85' }}>
              Dựa trên dữ liệu giao dịch trung bình 6 tháng gần nhất của các Provider đang hoạt động hiệu quả trên FlexTrip.
            </p>
          </div>

          <div className="mt-8 overflow-hidden rounded-2xl border" style={{ borderColor: '#DCEFFB' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'linear-gradient(90deg, #1e5aa8, #2a7bd9)', color: '#fff' }}>
                  <th className="px-6 py-4 text-left font-semibold">Danh mục</th>
                  <th className="px-6 py-4 text-center font-semibold">Thu nhập / tháng<br /><span className="text-xs font-normal opacity-80">(sau phí dịch vụ)</span></th>
                  <th className="px-6 py-4 text-center font-semibold">Số ngày cho thuê / tháng</th>
                </tr>
              </thead>
              <tbody>
                {INCOME_TABLE.map((row, i) => (
                  <tr
                    key={row.cat}
                    style={{
                      background: i % 2 === 0 ? '#fff' : '#f8fbff',
                      borderTop: '1px solid #DCEFFB',
                    }}
                  >
                    <td className="px-6 py-4 font-medium" style={{ color: '#0f1729' }}>{row.cat}</td>
                    <td className="px-6 py-4 text-center font-bold" style={{ color: '#2a7bd9' }}>{row.income}</td>
                    <td className="px-6 py-4 text-center" style={{ color: '#5a6b85' }}>{row.days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-center text-xs" style={{ color: '#8694ad' }}>
            * Thu nhập thực tế phụ thuộc vào chất lượng đồ, giá thuê, vị trí và số ngày sẵn sàng cho thuê mỗi tháng.
          </p>
        </div>
      </section>

      {/* ── 3 BƯỚC ĐĂNG KÝ ── */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold" style={{ color: '#0f1729' }}>3 bước trở thành Provider</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <div
                key={s.step}
                className="relative overflow-hidden rounded-2xl border bg-white p-6 pt-10 transition-all hover:-translate-y-1 hover:shadow-lg"
                style={{ borderColor: '#DCEFFB' }}
              >
                {/* Step badge */}
                <div
                  className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold text-white shadow-md"
                  style={{ background: 'linear-gradient(135deg, #2a7bd9, #92eee8)' }}
                >
                  {s.step}
                </div>
                {/* Connector line (not last) */}
                {i < STEPS.length - 1 && (
                  <div className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 sm:block">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M9 5l7 7-7 7" stroke="#DCEFFB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
                <div className="mb-3 text-4xl">{s.icon}</div>
                <h3 className="mb-2 font-bold" style={{ color: '#0f1729' }}>{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#5a6b85' }}>{s.desc}</p>
              </div>
            ))}
          </div>

          {/* Inline CTA below steps */}
          <div className="mt-10 flex justify-center">
            <button
              onClick={openModal}
              className="inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-sm font-bold text-white transition-all hover:scale-105 hover:shadow-xl"
              style={{ background: 'linear-gradient(135deg, #1e5aa8, #2a7bd9)', boxShadow: '0 8px 24px -8px rgba(42,123,217,0.45)' }}
            >
              Bắt đầu ngay — miễn phí
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* ── CTA BOTTOM ── */}
      <section
        className="py-24"
        style={{ background: 'linear-gradient(135deg, #0f1729 0%, #1e5aa8 50%, #2a7bd9 100%)' }}
      >
        <div className="mx-auto max-w-2xl px-6 text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider" style={{ background: 'rgba(146,238,232,0.2)', color: '#92eee8' }}>
            <span className="h-2 w-2 rounded-full bg-[#92eee8]" />
            Đăng ký miễn phí
          </span>
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            Sẵn sàng bắt đầu kiếm tiền?
          </h2>
          <p className="mb-8 text-base" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Đăng ký ngay hôm nay — FlexTrip sẽ liên hệ trong vòng 1 ngày làm việc và hỗ trợ bạn toàn bộ quy trình.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={openModal}
              className="inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-base font-bold transition-all hover:scale-105 hover:shadow-xl"
              style={{ background: '#fff', color: '#2a7bd9' }}
            >
              Đăng ký trở thành Provider →
            </button>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 rounded-2xl border px-8 py-4 text-base font-semibold text-white transition-all hover:bg-white/10"
              style={{ borderColor: 'rgba(255,255,255,0.35)' }}
            >
              Xem sản phẩm trước
            </Link>
          </div>
        </div>
      </section>

      {/* ── MODAL ĐĂNG KÝ ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,41,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl">
            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors hover:bg-gray-100"
              style={{ color: '#8694ad' }}
            >
              ✕
            </button>

            <div className="max-h-[90vh] overflow-y-auto rounded-3xl p-8">
              {submitted ? (
                /* Success state */
                <div className="flex flex-col items-center gap-4 py-10 text-center">
                  <div
                    className="flex h-20 w-20 items-center justify-center rounded-full text-4xl shadow-lg"
                    style={{ background: 'rgba(42,123,217,0.08)' }}
                  >
                    🎉
                  </div>
                  <h3 className="text-xl font-bold" style={{ color: '#0f1729' }}>Đăng ký thành công!</h3>
                  <p className="max-w-xs leading-relaxed" style={{ color: '#5a6b85' }}>
                    FlexTrip sẽ liên hệ với bạn trong vòng{' '}
                    <strong style={{ color: '#0f1729' }}>1 ngày làm việc</strong>{' '}
                    qua email hoặc số điện thoại đã đăng ký.
                  </p>
                  <button
                    onClick={closeModal}
                    className="mt-2 rounded-2xl px-8 py-3 text-sm font-bold text-white transition-all hover:shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #1e5aa8, #2a7bd9)' }}
                  >
                    Đóng
                  </button>
                </div>
              ) : (
                /* Form */
                <>
                  <div className="mb-6 text-center">
                    <h3 className="text-xl font-bold" style={{ color: '#2a7bd9' }}>
                      Đăng ký trở thành Provider
                    </h3>
                    <p className="mt-1 text-sm" style={{ color: '#5a6b85' }}>
                      Điền đầy đủ thông tin — FlexTrip liên hệ trong 1 ngày làm việc.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name + Phone */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold" style={{ color: '#0f1729' }}>
                          Họ và tên *
                        </label>
                        <input
                          required
                          value={form.name}
                          onChange={(e) => update('name', e.target.value)}
                          placeholder="Nguyễn Văn A"
                          className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-200"
                          style={{ borderColor: '#e2e8f3' }}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold" style={{ color: '#0f1729' }}>
                          Số điện thoại *
                        </label>
                        <input
                          required
                          value={form.phone}
                          onChange={(e) => update('phone', e.target.value)}
                          placeholder="0912 345 678"
                          className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-200"
                          style={{ borderColor: '#e2e8f3' }}
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold" style={{ color: '#0f1729' }}>
                        Email *
                      </label>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={(e) => update('email', e.target.value)}
                        placeholder="email@example.com"
                        className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-200"
                        style={{ borderColor: '#e2e8f3' }}
                      />
                    </div>

                    {/* City */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold" style={{ color: '#0f1729' }}>
                        Khu vực *
                      </label>
                      <select
                        required
                        value={form.city}
                        onChange={(e) => update('city', e.target.value)}
                        className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-200"
                        style={{ borderColor: '#e2e8f3', color: form.city ? '#0f1729' : '#8694ad' }}
                      >
                        <option value="">Chọn tỉnh / thành phố</option>
                        {CITIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    {/* Categories */}
                    <div>
                      <label className="mb-2 block text-xs font-semibold" style={{ color: '#0f1729' }}>
                        Loại đồ muốn cho thuê *
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((cat) => {
                          const active = form.categories.includes(cat.value);
                          return (
                            <button
                              key={cat.value}
                              type="button"
                              onClick={() => toggleCategory(cat.value)}
                              className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all hover:scale-105"
                              style={
                                active
                                  ? { background: '#2a7bd9', borderColor: '#2a7bd9', color: '#fff' }
                                  : { background: '#fff', borderColor: '#e2e8f3', color: '#0f1729' }
                              }
                            >
                              {cat.icon} {cat.label}
                            </button>
                          );
                        })}
                      </div>
                      {form.categories.length === 0 && (
                        <p className="mt-1.5 text-xs" style={{ color: '#8694ad' }}>Chọn ít nhất 1 danh mục</p>
                      )}
                    </div>

                    {/* Description */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold" style={{ color: '#0f1729' }}>
                        Mô tả ngắn về đồ muốn cho thuê
                      </label>
                      <textarea
                        value={form.description}
                        onChange={(e) => update('description', e.target.value)}
                        rows={3}
                        placeholder="VD: Tôi có 2 lều camping MSR, 1 xe đạp địa hình, muốn cho thuê vào cuối tuần tại Đà Lạt..."
                        className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-200"
                        style={{ borderColor: '#e2e8f3' }}
                      />
                    </div>

                    {submitError && (
                      <p className="rounded-xl px-4 py-3 text-sm font-medium" style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626' }}>
                        {submitError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={form.categories.length === 0 || submitting}
                      className="w-full rounded-2xl py-3.5 text-sm font-bold text-white transition-all hover:scale-[1.01] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      style={{ background: 'linear-gradient(135deg, #1e5aa8, #2a7bd9)' }}
                    >
                      {submitting ? 'Đang gửi...' : 'Gửi thông tin đến FlexTrip →'}
                    </button>

                    <p className="text-center text-xs" style={{ color: '#8694ad' }}>
                      Bằng cách đăng ký, bạn đồng ý với{' '}
                      <Link href="#" className="underline" style={{ color: '#2a7bd9' }}>Điều khoản dịch vụ</Link>{' '}
                      của FlexTrip.
                    </p>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
