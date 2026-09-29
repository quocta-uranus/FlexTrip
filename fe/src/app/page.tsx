import { LandingHeader } from "@/components/layout/landing-header";
import { HeroSection } from "@/components/landing/figma/hero-section";
import { PromiseStrip } from "@/components/landing/figma/promise-strip";
import { CategorySection } from "@/components/landing/figma/category-section";
import { FeaturedSection } from "@/components/landing/figma/featured-section";
import { StorySection } from "@/components/landing/figma/story-section";
import { HowSection } from "@/components/landing/figma/how-section";
import { TrustSection } from "@/components/landing/figma/trust-section";
import { ProviderSection } from "@/components/landing/figma/provider-section";
import { JournalSection } from "@/components/landing/figma/journal-section";
import { FinalCtaFooter } from "@/components/landing/figma/final-cta-footer";

export const metadata = {
  title: "FlexTrip — Cần thiết bị? Thuê thôi.",
  description: "Tìm và thuê thiết bị outdoor, camping, trekking từ cộng đồng địa phương tại Việt Nam. Linh hoạt, đơn giản, uy tín.",
};

export default function Home() {
  return (
    <div className="landing-shell min-h-screen bg-[#F1FAFF] text-slate-900 transition-colors duration-300">
      <LandingHeader />
      <main>
        <HeroSection />
        <PromiseStrip />
        <CategorySection />
        <FeaturedSection />
        <StorySection />
        <HowSection />
        <TrustSection />
        <ProviderSection />
        <JournalSection />
      </main>
      <FinalCtaFooter />
    </div>
  );
}
