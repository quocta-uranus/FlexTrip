'use client';

import * as React from 'react';
import { ChevronDown, Sparkles, Bot } from 'lucide-react';
import { PillBadge } from '@/components/ui/pill-badge';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

const FAQ_LIST: FaqItem[] = [
  {
    id: 'faq-1',
    question: 'Tiền đặt cọc được quản lý và hoàn trả như thế nào?',
    answer:
      'Toàn bộ khoản cọc được bảo vệ qua cơ chế Escrow của FlexTrip trong suốt thời gian thuê. Sau khi kết thúc chuyến đi, hai bên xác nhận hoàn trả thiết bị đúng hiện trạng ban đầu, hệ thống sẽ thực hiện giải ngân hoàn cọc tự động về tài khoản của bạn theo điều khoản hợp đồng.',
  },
  {
    id: 'faq-2',
    question: 'Làm thế nào để đảm bảo thiết bị nhận được đúng như mô tả?',
    answer:
      'FlexTrip chuẩn hóa quy trình đồng kiểm hai chiều: Khi nhận thiết bị, Traveler và Provider cùng chụp ảnh hiện trạng thực tế, đối soát phụ kiện và ghi nhận vào biên bản bàn giao số trước khi xác nhận kích hoạt hợp đồng.',
  },
  {
    id: 'faq-3',
    question: 'Nếu phát sinh hư hại thiết bị trong chuyến đi thì xử lý ra sao?',
    answer:
      'Mọi tin đăng trên FlexTrip đều có bảng quy tắc bồi hoàn (Penalty Rules) được niêm yết rõ ràng trước khi thuê. Trường hợp xảy ra bất đồng ý kiến, Trung tâm xử lý tranh chấp của FlexTrip sẽ tiếp nhận bằng chứng hình ảnh hai bên và đưa ra phán quyết khách quan theo điều khoản đã ký kết.',
  },
  {
    id: 'faq-4',
    question: 'Chính sách huỷ đơn và hoàn tiền hoạt động như thế nào?',
    answer:
      'Nếu bạn huỷ đơn trước ngày bắt đầu thuê từ 3 ngày trở lên, hệ thống hỗ trợ huỷ và hoàn trả 100% tiền đặt cọc. Nếu huỷ trong vòng 3 ngày trước giờ nhận đồ, khoản cọc sẽ được xử lý theo điều khoản hủy nhằm hỗ trợ chi phí chuẩn bị và giữ lịch của chủ đồ.',
  },
  {
    id: 'faq-5',
    question: 'Tôi muốn đăng thiết bị cho thuê (trở thành Provider) thì cần điều kiện gì?',
    answer:
      'Bạn chỉ cần truy cập trang Đăng ký Provider, điền thông tin cơ bản và hoàn thành xét duyệt danh tính (KYC CCCD/CMND) để bảo đảm an toàn cộng đồng. Sau khi duyệt, bạn toàn quyền đăng tin, đặt giá thuê và quản lý lịch sẵn sàng.',
  },
];

export function FaqSection() {
  const [openId, setOpenId] = React.useState<string | null>('faq-1');

  const handleToggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  const handleOpenAiChat = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-ai-chat'));
      const launcherBtn = document.querySelector<HTMLButtonElement>('button[aria-label="Mở FlexTrip AI"]');
      launcherBtn?.click();
    }
  };

  return (
    <section className="py-14 sm:py-18 lg:py-[84px] px-4 sm:px-6 lg:px-10 max-w-7xl mx-auto" id="faq">
      {/* ── Wayfare 2-Column FAQ Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
        {/* ── Left Column: Section Header & AI Chat Launcher Box (4 cols) ── */}
        <div className="lg:col-span-4 flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <PillBadge
                variant="stone"
                dot
                dotColor="bg-[#00A3FF]"
                className="bg-white text-[#075D82] border-sky-200/80 text-xs font-semibold px-3 py-1"
              >
                Hỏi đáp dịch vụ
              </PillBadge>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-[#0A1C2A] tracking-tight leading-[1.14]">
              Mọi điều bạn cần biết,{' '}
              <span className="bg-gradient-to-r from-[#1877F2] via-[#00A3FF] to-[#00D8F6] bg-clip-text text-transparent">
                rõ ràng và minh bạch.
              </span>
            </h2>

            <p className="mt-4 text-sm sm:text-base text-[#475569] leading-relaxed">
              Các thắc mắc phổ biến nhất về quy trình đặt cọc, bàn giao đồ, giải quyết sự cố và chính sách hoàn tiền tại FlexTrip.
            </p>
          </div>

          {/* Interactive AI Chat Help Box */}
          <div className="mt-8 sm:mt-12 p-6 rounded-3xl bg-white border border-[#DCEFFB] shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-[#075D82] mb-2">
              <Bot className="h-4 w-4 text-[#00A3FF]" />
              <span>Trợ lý AI FlexTrip</span>
            </div>

            <h3 className="text-base font-bold text-[#0A1C2A] tracking-tight">
              Cần giải đáp riêng cho chuyến đi?
            </h3>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
              Hỏi trợ lý AI về kinh nghiệm chọn đồ, thời tiết hoặc chính sách thuê thiết bị theo thời gian thực.
            </p>

            <div className="mt-5">
              <button
                type="button"
                onClick={handleOpenAiChat}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-xs sm:text-sm font-bold text-white transition-all shadow-md hover:brightness-110 cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #1877F2 0%, #00A3FF 60%, #00D8F6 100%)',
                }}
              >
                <Sparkles className="h-4 w-4" />
                <span>Trò chuyện với AI FlexTrip</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Right Column: Accessible Smooth Accordion List (8 cols) ── */}
        <div className="lg:col-span-8 space-y-4">
          {FAQ_LIST.map((item) => {
            const isOpen = openId === item.id;
            const buttonId = `faq-btn-${item.id}`;
            const panelId = `faq-panel-${item.id}`;

            return (
              <div
                key={item.id}
                className={`rounded-2xl transition-all border ${
                  isOpen
                    ? 'bg-white border-[#00A3FF]/40 shadow-sm'
                    : 'bg-white/80 border-[#DCEFFB] hover:bg-white hover:border-sky-300'
                }`}
              >
                <button
                  id={buttonId}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => handleToggle(item.id)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3FF] rounded-2xl"
                >
                  <span className="text-base sm:text-lg font-bold text-[#0A1C2A] tracking-tight">
                    {item.question}
                  </span>
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 ${
                      isOpen
                        ? 'bg-[#EBF7FD] text-[#00A3FF] rotate-180'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </button>

                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className={`grid transition-all duration-300 ease-in-out ${
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="px-5 sm:px-6 pb-6 pt-1 text-xs sm:text-sm text-[#475569] leading-relaxed border-t border-slate-100/80">
                      {item.answer}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
