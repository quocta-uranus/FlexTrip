import { getLenis } from '@/lib/lenis-instance';

// Chừa chỗ cho header cố định để tiêu đề section không bị che.
const SECTION_SCROLL_OFFSET = -88;

export function jumpToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return false;
  const lenis = getLenis();
  if (lenis) {
    lenis.scrollTo(el, { offset: SECTION_SCROLL_OFFSET, duration: 1.2 });
  } else {
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY + SECTION_SCROLL_OFFSET,
      behavior: 'smooth',
    });
  }
  return true;
}
