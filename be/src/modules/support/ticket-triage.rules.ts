import { TicketCategory, TicketPriority } from '@prisma/client';
import { normalizeVi } from '../../common/text.util';

export interface TriageResult {
  category: TicketCategory;
  priority: TicketPriority;
  reason: string;
}

const CATEGORY_KEYWORDS: Record<Exclude<TicketCategory, 'OTHER'>, string[]> = {
  PAYMENT: ['thanh toan', 'hoan tien', 'tru tien', ' vi ', 'nap tien', 'rut tien', ' coc ', 'hoa don', 'payos', 'giao dich', 'refund'],
  BOOKING: ['booking', 'don thue', 'dat thue', 'huy don', 'gia han', 'doi ngay', 'nhan do', 'tra do', 'giao nhan', 'hop dong'],
  ACCOUNT: ['dang nhap', 'mat khau', 'tai khoan', ' otp ', 'xac thuc', 'kyc', 'email', 'bao mat', ' 2fa ', 'bi khoa'],
  LISTING: ['tin dang', 'san pham', 'listing', 'dang tin', 'gia thue', 'anh san pham', 'danh gia', 'review'],
  TECHNICAL: [' loi ', 'khong vao duoc', 'bi treo', 'khong hien thi', 'trang trang', ' app ', 'website', ' bug ', 'khong tai duoc'],
};

const URGENT_KEYWORDS = ['lua dao', 'mat tien', 'bi tru tien', 'bi hack', 'bi danh cap', 'khan cap', ' gap '];
const HIGH_KEYWORDS = ['hoan tien', 'tranh chap', 'hu hong', 'that lac', 'khong nhan duoc', 'bi huy', 'khong dang nhap'];

function countHits(text: string, keywords: string[]): number {
  return keywords.reduce((n, k) => (text.includes(k) ? n + 1 : n), 0);
}

/** Deterministic fallback used when the AI provider is missing or fails. */
export function triageByRules(subject: string, description: string): TriageResult {
  const text = ` ${normalizeVi(`${subject} ${description}`).replace(/[^a-z0-9]+/g, ' ')} `;

  let category: TicketCategory = TicketCategory.OTHER;
  let best = 0;
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS) as [TicketCategory, string[]][]) {
    const hits = countHits(text, words);
    if (hits > best) {
      best = hits;
      category = cat;
    }
  }

  let priority: TicketPriority = TicketPriority.MEDIUM;
  if (countHits(text, URGENT_KEYWORDS) > 0) priority = TicketPriority.URGENT;
  else if (countHits(text, HIGH_KEYWORDS) > 0) priority = TicketPriority.HIGH;
  else if (category === TicketCategory.OTHER) priority = TicketPriority.LOW;

  return {
    category,
    priority,
    reason: best > 0 ? 'Phân loại theo từ khoá trong nội dung' : 'Không khớp từ khoá nào, đặt mức mặc định',
  };
}
