import { ArrowUpDown, CalendarDays, ChevronDown, KeyRound, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/empty-state';
import { RentalHistoryCard } from '@/components/profile/rental-history-card';
import { mockProviderHistory, mockTravelerHistory } from './_data';

const filterButtonClass =
  'flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-[13px] font-medium text-foreground';

export default function HistoryPage() {
  return (
    <>
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">Lịch sử thuê / cho thuê</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Xem lại các lượt bạn đã thuê hoặc các lượt cho thuê từ chỗ nghỉ của bạn.
        </p>
      </div>

      <Tabs defaultValue="traveler">
        <TabsList>
          <TabsTrigger value="traveler">Đã thuê ({mockTravelerHistory.length})</TabsTrigger>
          <TabsTrigger value="provider">Đã cho thuê ({mockProviderHistory.length})</TabsTrigger>
        </TabsList>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" className={filterButtonClass}>
            <CalendarDays className="size-4 text-muted-foreground" strokeWidth={1.8} />
            Tất cả thời gian
            <ChevronDown className="size-3.5 text-muted-foreground" strokeWidth={2} />
          </button>
          <button type="button" className={filterButtonClass}>
            <SlidersHorizontal className="size-4 text-muted-foreground" strokeWidth={1.8} />
            Tất cả trạng thái
            <ChevronDown className="size-3.5 text-muted-foreground" strokeWidth={2} />
          </button>
          <div className="flex-1" />
          <button type="button" className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground">
            <ArrowUpDown className="size-3.5" strokeWidth={1.8} />
            Mới nhất
          </button>
        </div>

        <TabsContent value="traveler" className="mt-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {mockTravelerHistory.map((item, index) => (
              <RentalHistoryCard key={item.id} item={item} index={index} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="provider" className="mt-6">
          {mockProviderHistory.length === 0 ? (
            <EmptyState
              icon={KeyRound}
              title="Bạn chưa cho thuê chỗ nghỉ nào"
              description="Đăng tin chỗ nghỉ đầu tiên để bắt đầu đón khách và theo dõi lịch sử cho thuê ngay tại đây."
              action={
                <Button className="rounded-full bg-gradient-to-br from-brand-from to-brand-to text-white hover:opacity-90">
                  Đăng tin cho thuê
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {mockProviderHistory.map((item, index) => (
                <RentalHistoryCard key={item.id} item={item} index={index} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
