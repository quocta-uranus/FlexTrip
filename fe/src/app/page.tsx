import { SiteHeader } from "@/components/layout/site-header";
import { HeroSection } from "@/components/landing/figma/hero-section";
import { StatsBar } from "@/components/landing/figma/stats-bar";
import { StorySection } from "@/components/landing/figma/story-section";
import { CategorySection } from "@/components/landing/figma/category-section";
import { FeaturedSection } from "@/components/landing/figma/featured-section";
import { HowSection } from "@/components/landing/figma/how-section";
import { ReviewsSection } from "@/components/landing/figma/reviews-section";
import { ProviderSection } from "@/components/landing/figma/provider-section";
import { FaqSection } from "@/components/landing/figma/faq-section";
import { FinalCtaFooter } from "@/components/landing/figma/final-cta-footer";
import { HomeGate } from "@/components/home/home-gate";
import { SmoothScroll } from "@/components/landing/smooth-scroll";
import { ScrollReveal } from "@/components/landing/scroll-reveal";

export const metadata = {
  title: "FlexTrip — Cần thiết bị? Thuê thôi.",
  description: "Tìm và thuê thiết bị outdoor, camping, trekking từ cộng đồng địa phương tại Việt Nam. Linh hoạt, đơn giản, uy tín.",
};

export default function Home() {
  return (
    <HomeGate>
    <SmoothScroll>
      <div className="landing-shell min-h-screen bg-[#F1FAFF] text-slate-900 transition-colors duration-300">
        <SiteHeader />
        <main>
          {/* 1. Inset Hero Shell with Rotating Images, Capsule Search & AI Trigger */}
          <HeroSection />

          {/* 2. Real Stats Bar from GET /public/stats */}
          <ScrollReveal delayMs={40}>
            <StatsBar />
          </ScrollReveal>

          {/* 3. Scroll-scrub promise headline + 4 core commitments */}
          <ScrollReveal delayMs={60}>
            <StorySection />
          </ScrollReveal>

          {/* 5. Category Carousel (Pinned on Desktop, Unpinned on Mobile) */}
          <CategorySection />

          {/* 6. Featured Equipment Grid ("Được thuê nhiều tuần này") */}
          <ScrollReveal delayMs={60}>
            <FeaturedSection />
          </ScrollReveal>

          {/* 8. 3-Step Rental Journey */}
          <ScrollReveal delayMs={60}>
            <HowSection />
          </ScrollReveal>

          {/* 9. Real Verified Reviews */}
          <ScrollReveal delayMs={60}>
            <ReviewsSection />
          </ScrollReveal>

          {/* 10. Gear Owners / Host Operations Banner (#097DAE - 90% Revenue) */}
          <ScrollReveal delayMs={60}>
            <ProviderSection />
          </ScrollReveal>

          {/* 11. FAQ Accordion */}
          <ScrollReveal delayMs={60}>
            <FaqSection />
          </ScrollReveal>
        </main>

        {/* Pre-Footer Final CTA Banner & Wayfare Minimal Footer */}
        <FinalCtaFooter />
      </div>
    </SmoothScroll>
    </HomeGate>
  );
}
