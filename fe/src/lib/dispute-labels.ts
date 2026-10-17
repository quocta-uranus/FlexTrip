export const DISPUTE_TYPE_LABELS: Record<string, string> = {
  REFUND_REQUEST: 'Yêu cầu hoàn tiền',
  PAYMENT_DISPUTE: 'Tranh chấp thanh toán',
  CANCELLATION_DISPUTE: 'Tranh chấp hủy đơn',
  DAMAGE_CLAIM: 'Yêu cầu bồi thường',
};

export const DISPUTE_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Mới mở',
  UNDER_REVIEW: 'Đang xem xét',
  PENDING_INFO: 'Chờ bổ sung thông tin',
  ESCALATED: 'Đã chuyển cấp trên',
  RESOLVED: 'Đã giải quyết',
  REJECTED: 'Đã từ chối',
};

export const DISPUTE_PRIORITY_LABELS: Record<string, string> = {
  CRITICAL: 'Khẩn cấp',
  HIGH: 'Cao',
  MEDIUM: 'Trung bình',
  LOW: 'Thấp',
};

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  PENDING_APPROVAL: 'Chờ provider duyệt',
  CONFIRMED: 'Đã xác nhận',
  IN_PROGRESS: 'Đang thuê',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
  DISPUTED: 'Đang tranh chấp',
  REFUNDING: 'Đang hoàn tiền',
  REFUNDED: 'Đã hoàn tiền',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  FAILED: 'Thất bại',
  REFUNDED: 'Đã hoàn tiền',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  WALLET: 'Ví FlexTrip',
  PAYOS: 'PayOS',
};

export const CONTRACT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ ký',
  TRAVELER_SIGNED: 'Traveler đã ký, chờ provider',
  SIGNED: 'Hai bên đã ký',
  ACTIVE: 'Đang hiệu lực',
  CLOSED: 'Đã đóng',
  DISPUTED: 'Đang tranh chấp',
};

export const DISPUTE_ACTION_LABELS: Record<string, string> = {
  DISPUTE_STATUS_CHANGED: 'Đổi trạng thái tranh chấp',
  DISPUTE_PRIORITY_CHANGED: 'Đổi độ ưu tiên',
  DISPUTE_RESOLVED: 'Chấp nhận tranh chấp',
  DISPUTE_REJECTED: 'Từ chối tranh chấp',
  DISPUTE_STAFF_ESCALATED: 'Nhân viên chuyển tranh chấp lên admin',
};

export const DISPUTE_FIELD_LABELS: Record<string, string> = {
  status: 'Trạng thái',
  priority: 'Độ ưu tiên',
  note: 'Ghi chú',
  resolution: 'Kết luận',
  refundAmount: 'Tiền hoàn cho traveler',
  penaltyAmount: 'Tiền phạt trả cho provider',
  bookingStatus: 'Trạng thái booking',
  mediationId: 'Mã biên bản',
  bookingId: 'Mã booking',
  evidenceUrls: 'Bằng chứng',
};

/** Translates enum values inside an audit entry; money and free text pass through. */
export function describeDisputeValue(key: string, value: unknown): string {
  if (value == null || value === '') return '—';
  if (Array.isArray(value)) return key === 'evidenceUrls' ? `${value.length} ảnh` : value.join(', ');
  const text = String(value);
  if (key === 'status') return DISPUTE_STATUS_LABELS[text] ?? text;
  if (key === 'priority') return DISPUTE_PRIORITY_LABELS[text] ?? text;
  if (key === 'bookingStatus') return BOOKING_STATUS_LABELS[text] ?? text;
  if (key === 'refundAmount' || key === 'penaltyAmount') return `${Number(text).toLocaleString('vi-VN')}đ`;
  return text;
}
