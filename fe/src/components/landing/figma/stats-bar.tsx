'use client';

import { useQuery } from '@tanstack/react-query';
import { publicStatsApi } from '@/lib/api/client';
import { Tent, Users, CheckCircle, Star } from 'lucide-react';

// Số quá nhỏ làm giảm uy tín nên chỉ hiện ô khi đủ ngưỡng.
const MIN_STATS = { listings: 20, providers: 10, bookings: 50, reviews: 10 } as const;

const GRID_COLS: Record<number, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
};

export function StatsBar() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['public', 'stats'],
    queryFn: publicStatsApi.getStats,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 my-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-white/60 animate-pulse border border-sky-100/80" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const items = [
    {
      id: 'listings',
      value: stats.activeListings,
      formatted: `${stats.activeListings}+`,
      label: 'Thiết bị sẵn sàng',
      subtext: 'Đa dạng từ lều, SUP đến flycam',
      icon: Tent,
      visible: stats.activeListings >= MIN_STATS.listings,
    },
    {
      id: 'providers',
      value: stats.approvedProviders,
      formatted: `${stats.approvedProviders}+`,
      label: 'Chủ đồ xác minh',
      subtext: 'Đối tác được duyệt kỹ lưỡng',
      icon: Users,
      visible: stats.approvedProviders >= MIN_STATS.providers,
    },
    {
      id: 'bookings',
      value: stats.completedBookings,
      formatted: `${stats.completedBookings}+`,
      label: 'Chuyến đi hoàn tất',
      subtext: 'Bàn giao đúng hẹn, an tâm',
      icon: CheckCircle,
      visible: stats.completedBookings >= MIN_STATS.bookings,
    },
    {
      id: 'rating',
      value: stats.publishedReviews,
      formatted: `${stats.averageRating.toFixed(1)} ★`,
      label: 'Đánh giá hài lòng',
      subtext: `${stats.publishedReviews} lượt nhận xét thực tế`,
      icon: Star,
      visible: stats.publishedReviews >= MIN_STATS.reviews,
    },
  ].filter((item) => item.visible);

  if (items.length === 0) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 my-6 sm:my-8" aria-label="Thống kê thực tế">
      <div className={`grid grid-cols-2 ${GRID_COLS[Math.min(items.length, 4)]} gap-3 sm:gap-4`}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="bg-white/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-sky-100 shadow-soft hover:shadow-card transition-all duration-300 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
                  {item.formatted}
                </span>
                <div className="h-8 w-8 rounded-full bg-sky-50 flex items-center justify-center text-brand shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-800">{item.label}</p>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 line-clamp-1">{item.subtext}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
