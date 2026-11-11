// Lượt dùng đã "tiêu" thì mới tính vào perUserLimit
export const CONSUMING_STATUSES = ['RESERVED', 'APPLIED', 'FORFEITED'] as const;

export const VoucherErrorCode = {
  NOT_FOUND: 'VOUCHER_NOT_FOUND',
  INACTIVE: 'VOUCHER_INACTIVE',
  NOT_STARTED: 'VOUCHER_NOT_STARTED',
  EXPIRED: 'VOUCHER_EXPIRED',
  NOT_ELIGIBLE: 'VOUCHER_NOT_ELIGIBLE',
  CATEGORY_MISMATCH: 'VOUCHER_CATEGORY_MISMATCH',
  MIN_ORDER: 'VOUCHER_MIN_ORDER',
  QUOTA_EXHAUSTED: 'VOUCHER_QUOTA_EXHAUSTED',
  USER_LIMIT: 'VOUCHER_USER_LIMIT',
  BUDGET_EXHAUSTED: 'VOUCHER_BUDGET_EXHAUSTED',
  NOT_APPLICABLE: 'VOUCHER_NOT_APPLICABLE',
} as const;

export const VoucherErrorMessage: Record<string, string> = {
  VOUCHER_NOT_FOUND: 'Mã giảm giá không tồn tại',
  VOUCHER_INACTIVE: 'Mã giảm giá hiện không khả dụng',
  VOUCHER_NOT_STARTED: 'Mã giảm giá chưa đến thời gian áp dụng',
  VOUCHER_EXPIRED: 'Mã giảm giá đã hết hạn',
  VOUCHER_NOT_ELIGIBLE: 'Bạn không thuộc đối tượng được dùng mã này',
  VOUCHER_CATEGORY_MISMATCH: 'Mã không áp dụng cho danh mục thiết bị này',
  VOUCHER_MIN_ORDER: 'Đơn hàng chưa đạt giá trị tối thiểu để dùng mã',
  VOUCHER_QUOTA_EXHAUSTED: 'Mã giảm giá đã hết lượt sử dụng',
  VOUCHER_USER_LIMIT: 'Bạn đã dùng hết số lượt cho mã này',
  VOUCHER_BUDGET_EXHAUSTED: 'Chương trình khuyến mãi đã hết ngân sách',
  VOUCHER_NOT_APPLICABLE: 'Mã giảm giá không áp dụng được cho đơn này',
};
