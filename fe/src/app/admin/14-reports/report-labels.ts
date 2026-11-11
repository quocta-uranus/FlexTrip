import type { ReportFrequency, ReportType } from '@/types/support';

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  REVENUE: 'Doanh thu theo ngày',
  BOOKINGS: 'Danh sách booking',
  COMMISSION: 'Hoa hồng',
};

export const FREQUENCY_LABELS: Record<ReportFrequency, { option: string; short: string }> = {
  WEEKLY: { option: 'Hàng tuần (thứ Hai)', short: 'Hàng tuần' },
  MONTHLY: { option: 'Hàng tháng (ngày 1)', short: 'Hàng tháng' },
};
