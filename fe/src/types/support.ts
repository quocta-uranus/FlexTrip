export type TicketCategory = 'BOOKING' | 'PAYMENT' | 'ACCOUNT' | 'LISTING' | 'TECHNICAL' | 'OTHER';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_USER' | 'RESOLVED' | 'CLOSED';
export type TicketTriageSource = 'PENDING' | 'AI' | 'RULES' | 'ADMIN';
export type ReportType = 'REVENUE' | 'BOOKINGS' | 'COMMISSION';
export type ReportFrequency = 'WEEKLY' | 'MONTHLY';

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  BOOKING: 'Đơn thuê',
  PAYMENT: 'Thanh toán & hoàn tiền',
  ACCOUNT: 'Tài khoản & bảo mật',
  LISTING: 'Tin đăng & đánh giá',
  TECHNICAL: 'Lỗi kỹ thuật',
  OTHER: 'Khác',
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: 'Mới',
  IN_PROGRESS: 'Đang xử lý',
  WAITING_USER: 'Chờ bạn phản hồi',
  RESOLVED: 'Đã giải quyết',
  CLOSED: 'Đã đóng',
};

export const TICKET_STATUS_STYLES: Record<TicketStatus, string> = {
  OPEN: 'bg-red-50 text-red-700',
  IN_PROGRESS: 'bg-amber-50 text-amber-700',
  WAITING_USER: 'bg-blue-50 text-blue-700',
  RESOLVED: 'bg-green-50 text-green-700',
  CLOSED: 'bg-slate-100 text-slate-600',
};

export interface TicketMessage {
  id: string;
  body: string;
  isStaff: boolean;
  authorName: string;
  createdAt: string;
}

export interface MyTicketItem {
  id: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MyTicketDetail extends MyTicketItem {
  description: string;
  booking: { id: string; status: string; title: string } | null;
  messages: TicketMessage[];
}

export interface FaqPublic {
  id: string;
  question: string;
  answer: string;
  category: TicketCategory;
}
