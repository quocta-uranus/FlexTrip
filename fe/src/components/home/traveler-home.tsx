'use client';

import { useMemo } from 'react';
import { GuideSection } from './guide-section';
import { TravelerFooter } from '@/components/layout/traveler-footer';
import { useMyBookings } from '@/hooks/useBookings';
import { useForYouListings } from '@/hooks/useRecommendations';
import { SiteHeader } from '@/components/layout/site-header';
import { HeroSection } from '@/components/landing/figma/hero-section';
import { CategoryCarousel } from './category-carousel';
import { RecommendationRow } from '@/components/recommendations/recommendation-row';
import { UpcomingTripCard, pickUpcomingBooking } from './upcoming-trip-card';
import { ProviderTaskCard } from './provider-task-card';


function greeting() {
  const hour = new Date().getHours();
  if (hour < 11) return 'Chào buổi sáng';
  if (hour < 14) return 'Chào buổi trưa';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

export function TravelerHome({ userName }: { userName: string }) {
  const { data: bookings } = useMyBookings({ limit: 20 });
  const { data: forYou, isLoading: forYouLoading } = useForYouListings(true);
  const upcoming = pickUpcomingBooking(bookings);

  // A recommendation for the item already in the upcoming order adds nothing.
  const recommendations = useMemo(
    () => forYou?.items.filter((item) => item.id !== upcoming?.listingId),
    [forYou, upcoming?.listingId],
  );

  return (
    <div className="min-h-screen bg-[#F1FAFF] text-slate-900">
      <SiteHeader />

      <HeroSection
        compact
        aiLabel="AI tư vấn thiết bị"
        eyebrow="Traveler"
        headline={
          <>
            {greeting()},<br />
            <span className="lg:whitespace-nowrap bg-gradient-to-r from-brand-mint via-brand to-brand-blue bg-clip-text text-transparent">
              {userName}!
            </span>
          </>
        }
        subtitle={
          upcoming
            ? `Bạn có đơn thuê đang chạy: ${upcoming.listing?.title?.trim() || 'thiết bị của bạn'}. Chuẩn bị cho hành trình tiếp theo nhé.`
            : 'Hôm nay bạn muốn thuê gì? Tìm thiết bị cho chuyến đi tiếp theo của bạn.'
        }
      />

      <main>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="relative z-20 -mt-12">
            <UpcomingTripCard />
          </div>

          <ProviderTaskCard />

          <div className="mt-16 scroll-mt-28 lg:mt-20 [&>section]:mb-0">
            <RecommendationRow
              title="Gợi ý dành riêng cho bạn"
              subtitle={
                forYou?.source === 'personalized'
                  ? 'Dựa trên sở thích và lịch sử thuê của bạn'
                  : 'Đang được thuê nhiều trên FlexTrip'
              }
              items={recommendations}
              isLoading={forYouLoading}
            />
          </div>
        </div>

        <div className="mt-16 lg:mt-20">
          <CategoryCarousel />
        </div>

        <div className="mx-auto mt-16 max-w-6xl px-4 pb-16 sm:px-6 lg:mt-20 lg:px-8">
          <GuideSection />
        </div>
      </main>

      <TravelerFooter />
    </div>
  );
}
