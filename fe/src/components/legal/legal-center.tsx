'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { CalendarDays, FileText, List, Mail, Printer, Scale, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { LEGAL_META, LEGAL_PARTS, type LegalBlock, type LegalGroup } from './legal-content';

type Tab = 'all' | LegalGroup;

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'all', label: 'Toàn bộ chính sách' },
  { id: 'terms', label: 'Điều khoản sử dụng' },
  { id: 'privacy', label: 'Quyền riêng tư' },
];

function Block({ block }: { block: LegalBlock }) {
  return (
    <div className="space-y-2">
      {block.heading && <h4 className="pt-1 text-[0.95rem] font-bold leading-[1.85] text-ink">{block.heading}</h4>}
      {block.paragraphs?.map((text) => (
        <p key={text} className="text-[0.95rem] leading-[1.85] text-slate-600">{text}</p>
      ))}
      {block.bullets && (
        <ul className="list-disc space-y-1 pl-5 text-[0.95rem] leading-[1.85] text-slate-600 marker:text-slate-400">
          {block.bullets.map((text) => <li key={text}>{text}</li>)}
        </ul>
      )}
      {block.steps && (
        <ol className="list-decimal space-y-1 pl-5 text-[0.95rem] leading-[1.85] text-slate-600 marker:font-bold marker:text-brand-blue">
          {block.steps.map((text) => <li key={text}>{text}</li>)}
        </ol>
      )}
    </div>
  );
}

const TOP_ID = 'chinh-sach';
// The first part of each group: its tab scrolls here instead of hiding the other parts.
const TAB_TARGET: Record<Tab, string> = { all: TOP_ID, terms: 'phan-1', privacy: 'phan-4' };
const ACTIVE_OFFSET = 180;
// Both routes render the same document; the address bar only says which part you are reading.
const TAB_URL: Record<Tab, string> = { all: `/terms#${TOP_ID}`, terms: '/terms', privacy: '/privacy' };

// The support centre needs a signed-in account (tickets), so guests are pointed at the public FAQ instead.
const SUPPORT_HREF = '/support';

export function LegalCenter({ initialTab = 'all' }: { initialTab?: Tab }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [tab, setTab] = useState<Tab>(initialTab);
  const urlTab = useRef<Tab>(initialTab);
  const parts = LEGAL_PARTS;

  function showTab(next: Tab) {
    setTab(next);
    if (urlTab.current === next) return;
    urlTab.current = next;
    window.history.replaceState(null, '', TAB_URL[next]);
  }

  // While a tab click is scrolling smoothly, the parts it passes on the way must not change the tab or address.
  // The lock ends once the target tab is reached, or after a timeout in case it never is.
  const jumpTarget = useRef<Tab | null>(null);
  const jumpTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function jumpTo(next: Tab) {
    showTab(next);
    jumpTarget.current = next;
    if (jumpTimeout.current) clearTimeout(jumpTimeout.current);
    jumpTimeout.current = setTimeout(() => { jumpTarget.current = null; }, 5000);
    document.getElementById(TAB_TARGET[next])?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Opening /terms or /privacy lands on its own part of the policy.
  useEffect(() => {
    if (initialTab === 'all' || window.location.hash) return;
    document.getElementById(TAB_TARGET[initialTab])?.scrollIntoView({ block: 'start' });
  }, [initialTab]);

  // The active tab (and the address) follows whichever part is currently at the top of the screen.
  useEffect(() => {
    function sync() {
      let current: Tab = 'all';
      for (const part of LEGAL_PARTS) {
        const el = document.getElementById(part.id);
        if (el && el.getBoundingClientRect().top <= ACTIVE_OFFSET) current = part.group;
      }
      if (jumpTarget.current) {
        if (current !== jumpTarget.current) return;
        jumpTarget.current = null;
      }
      showTab(current);
    }
    // Scrolling by hand takes over from a jump that is still in progress.
    function cancelJump() { jumpTarget.current = null; }
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('wheel', cancelJump, { passive: true });
    window.addEventListener('touchstart', cancelJump, { passive: true });
    window.addEventListener('keydown', cancelJump);
    return () => {
      window.removeEventListener('scroll', sync);
      window.removeEventListener('wheel', cancelJump);
      window.removeEventListener('touchstart', cancelJump);
      window.removeEventListener('keydown', cancelJump);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- showTab only touches state and a ref
  }, []);

  return (
    <main className="w-full flex-1 pb-16">
      {/* Hero that starts at the very top, so the header sits over it transparent like on the landing page. */}
      <section className="relative mx-2 mt-2 overflow-hidden rounded-[28px] border border-sky-100 bg-gradient-to-br from-sky-50 via-sky-100 to-sky-200 sm:mx-2.5 sm:rounded-[32px] print:hidden">
        <div className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-8 px-4 pb-10 pt-28 sm:px-6 sm:pb-14 sm:pt-36 lg:px-8">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-300 bg-white/70 px-3.5 py-1.5 text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-brand-blue">
              <Scale className="h-3.5 w-3.5" aria-hidden="true" /> Trung tâm pháp lý
            </span>
            <h1 className="mt-4 text-[clamp(2.25rem,3.5vw+1rem,3.2rem)] font-extrabold leading-[1.02] tracking-[-0.055em]! text-ink">
              Chính sách rõ ràng cho mọi chuyến thuê
            </h1>
            <p className="mt-4 max-w-xl text-[0.98rem] leading-[1.75] text-slate-600">
              Tìm hiểu quyền, nghĩa vụ và cách FlexTrip bảo vệ giao dịch giữa Traveler và Provider.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5 text-[0.85rem] font-bold text-ink">
              <span className="inline-flex items-center gap-2 rounded-xl bg-white/80 px-3.5 py-2">
                <FileText className="h-4 w-4 text-brand-blue" aria-hidden="true" /> Phiên bản {LEGAL_META.version}
              </span>
              <span className="inline-flex items-center gap-2 rounded-xl bg-white/80 px-3.5 py-2">
                <CalendarDays className="h-4 w-4 text-brand-blue" aria-hidden="true" /> Cập nhật {LEGAL_META.updatedAt}
              </span>
            </div>
          </div>
          <div
            aria-hidden="true"
            className="hidden h-44 w-44 shrink-0 items-center justify-center rounded-full border border-sky-300 bg-white/60 md:flex lg:h-52 lg:w-52"
          >
            <ShieldCheck className="h-20 w-20 text-brand-blue lg:h-24 lg:w-24" strokeWidth={1.5} />
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6">
      <div
        role="tablist"
        aria-label="Loại chính sách"
        className="mb-5 flex flex-wrap gap-2 print:hidden"
      >
        {TABS.map(({ id, label }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => jumpTo(id)}
              className={`rounded-full border px-4 py-2 text-[0.85rem] font-extrabold ${
                active
                  ? 'border-[#2a7bd9] bg-[#2a7bd9] text-white'
                  : 'border-[#b9dafa] bg-white text-[#2a7bd9] hover:bg-[#f1f8ff]'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
        <aside className="rounded-2xl border border-sky-100 bg-white/90 p-4 print:hidden lg:sticky lg:top-28">
          <p className="mb-3 flex items-center gap-2 text-[0.78rem] font-extrabold uppercase tracking-[0.08em] text-ink">
            <List className="h-4 w-4" aria-hidden="true" /> Mục lục
          </p>
          <nav aria-label="Mục lục chính sách" className="space-y-0.5">
            {parts.map((part) => (
              <a
                key={part.id}
                href={`#${part.id}`}
                className="flex gap-2.5 rounded-lg px-2 py-2 text-[0.85rem] font-bold leading-[1.5] text-slate-600 transition-colors hover:bg-sky-50 hover:text-brand-blue"
              >
                <span className="min-w-7 font-extrabold text-brand-blue">{part.numeral}</span>
                <span>{part.title}</span>
              </a>
            ))}
          </nav>
          <div className="mt-3 space-y-0.5 border-t border-slate-200 pt-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[0.85rem] font-bold text-slate-700 transition-colors hover:bg-sky-50"
            >
              <Printer className="h-4 w-4" aria-hidden="true" /> In chính sách
            </button>
            <Link
              href={isAuthenticated ? SUPPORT_HREF : '/#faq'}
              className="flex items-center gap-2 rounded-lg px-2 py-2 text-[0.85rem] font-bold text-slate-700 transition-colors hover:bg-sky-50"
            >
              <Mail className="h-4 w-4" aria-hidden="true" /> {isAuthenticated ? 'Liên hệ hỗ trợ' : 'Câu hỏi thường gặp'}
            </Link>
          </div>
        </aside>

        <article id={TOP_ID} className="min-w-0 scroll-mt-28 rounded-2xl border border-sky-100 bg-white p-5 sm:p-8">
          <h2 className="text-[clamp(1.75rem,2.6vw+1rem,2.56rem)] font-extrabold leading-[1.08] tracking-[-0.04em]! text-ink">
            {LEGAL_META.title}
          </h2>
          <dl className="mt-5 space-y-1 text-[0.95rem] leading-[1.85] text-slate-600">
            <div><dt className="inline font-bold text-ink">Phiên bản: </dt><dd className="inline">{LEGAL_META.version}</dd></div>
            <div><dt className="inline font-bold text-ink">Ngày cập nhật: </dt><dd className="inline">{LEGAL_META.updatedAt}</dd></div>
            <div><dt className="inline font-bold text-ink">Phạm vi áp dụng: </dt><dd className="inline">{LEGAL_META.scope}</dd></div>
          </dl>
          <p className="mt-5 border-l-4 border-brand-blue bg-sky-50 px-4 py-3 text-[0.95rem] leading-[1.85] text-slate-600">
            {LEGAL_META.notice}
          </p>

          <div className="mt-8 space-y-14">
            {parts.map((part) => (
              <section key={part.id} id={part.id} className="scroll-mt-28">
                <h2 className="border-t border-slate-200 pt-9 text-[clamp(1.5rem,1.6vw+1rem,1.92rem)] font-extrabold leading-normal tracking-[-0.035em]! text-ink">
                  Phần {part.numeral} – {part.title}
                </h2>
                <div className="mt-5 space-y-8">
                  {part.sections.map((section) => (
                    <div key={section.number} className="space-y-3">
                      <h3 className="text-[1.08rem] font-extrabold leading-normal tracking-normal! text-ink">
                        {section.number}. {section.title}
                      </h3>
                      {section.blocks.map((block, i) => <Block key={i} block={block} />)}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <p className="mt-12 border-t border-slate-200 pt-6 text-center text-[0.95rem] text-slate-600 print:hidden">
            Có câu hỏi về chính sách?{' '}
            {isAuthenticated ? (
              <Link href={SUPPORT_HREF} className="font-bold text-brand-blue hover:underline">Liên hệ hỗ trợ</Link>
            ) : (
              <>
                Xem{' '}
                <Link href="/#faq" className="font-bold text-brand-blue hover:underline">câu hỏi thường gặp</Link>
                {' '}hoặc{' '}
                <Link href={`/login?redirect=${encodeURIComponent(SUPPORT_HREF)}`} className="font-bold text-brand-blue hover:underline">
                  đăng nhập để gửi yêu cầu hỗ trợ
                </Link>
                .
              </>
            )}
          </p>
        </article>
      </div>
      </div>
    </main>
  );
}
