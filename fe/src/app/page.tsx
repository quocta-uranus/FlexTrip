import { LandingHeader } from "@/components/layout/landing-header";
import { HeroSection } from "@/components/landing/figma/hero-section";
import { PromiseStrip } from "@/components/landing/figma/promise-strip";
import { StorySection } from "@/components/landing/figma/story-section";
import { CategorySection } from "@/components/landing/figma/category-section";
import { FeaturedSection } from "@/components/landing/figma/featured-section";
import { DarkAccordionSection } from "@/components/landing/figma/dark-accordion-section";
import { HowSection } from "@/components/landing/figma/how-section";
import { ProviderSection } from "@/components/landing/figma/provider-section";
import { FaqSection } from "@/components/landing/figma/faq-section";
import { FinalCtaFooter } from "@/components/landing/figma/final-cta-footer";
import { SmoothScroll } from "@/components/landing/smooth-scroll";
import { ScrollReveal } from "@/components/landing/scroll-reveal";

// Các section tạm ẩn theo yêu cầu nghiệm thu tinh gọn (vẫn lưu giữ file component trong source code):
// import { TrustSection } from "@/components/landing/figma/trust-section";
// import { TestimonialBanner } from "@/components/landing/figma/testimonial-banner";
// import { JournalSection } from "@/components/landing/figma/journal-section";

export const metadata = {
  title: "FlexTrip — Cần thiết bị? Thuê thôi.",
  description: "Tìm và thuê thiết bị outdoor, camping, trekking từ cộng đồng địa phương tại Việt Nam. Linh hoạt, đơn giản, uy tín.",
};

export default function Home() {
  return (
    <SmoothScroll>
      <div className="landing-shell min-h-screen bg-[#F1FAFF] text-slate-900 transition-colors duration-300">
        <LandingHeader />
        <main>
          {/* 1. Inset Hero Shell with Capsule Quick Search */}
          <HeroSection />

          {/* 2. Scroll-Scrub Text Reveal (Preserved native scrub) */}
          <PromiseStrip />

          {/* 3. Why FlexTrip / 3-Column Asymmetric Layout with Merged Trust Standards */}
          <ScrollReveal delayMs={60}>
            <StorySection />
          </ScrollReveal>

          {/* 4. Scroll-Driven Horizontal Carousel (Pinned on Desktop) */}
          <CategorySection />

          {/* 5. Capsule Filter Bar & Equipment Grid */}
          <ScrollReveal delayMs={60}>
            <FeaturedSection />
          </ScrollReveal>

          {/* 6. Outdoor Experiences Dark Accordion with Dynamic Image Switcher */}
          <ScrollReveal delayMs={60}>
            <DarkAccordionSection />
          </ScrollReveal>

          {/* 7. 3-Step Rental Journey */}
          <ScrollReveal delayMs={60}>
            <HowSection />
          </ScrollReveal>

          {/* 8. Gear Owners / Condensed Host Operations Section */}
          <ScrollReveal delayMs={60}>
            <ProviderSection />
          </ScrollReveal>

          {/* 9. Accessible FAQ Accordion & Real AI Assistant */}
          <ScrollReveal delayMs={60}>
            <FaqSection />
          </ScrollReveal>
        </main>

        {/* 10. Pre-Footer Final CTA Banner & Wayfare Minimal Footer */}
        <FinalCtaFooter />
      </div>
    </SmoothScroll>
  );
}
