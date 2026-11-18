// Toàn bộ chữ nghĩa cố định của hợp đồng v2 nằm ở đây để người rà soát nội dung (Admin) sửa mà không phải đọc logic.
// Nguyên tắc: chỉ nêu số liệu mà hệ thống thực sự có hoặc thực sự áp dụng. Không đưa con số "cho đủ mẫu".

export const CONTRACT_TITLE = 'HỢP ĐỒNG THUÊ THIẾT BỊ';
export const NATION_HEADER: [string, string] = ['CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', 'Độc lập - Tự do - Hạnh phúc'];

export const LEGAL_BASIS = [
  'Căn cứ Bộ luật Dân sự số 91/2015/QH13 được Quốc hội nước Cộng hòa xã hội chủ nghĩa Việt Nam thông qua ngày 24 tháng 11 năm 2015;',
  'Căn cứ Luật Giao dịch điện tử số 20/2023/QH15 được Quốc hội nước Cộng hòa xã hội chủ nghĩa Việt Nam thông qua ngày 22 tháng 6 năm 2023;',
  'Căn cứ vào nhu cầu và khả năng của các bên.',
];

export const INTRO =
  'Sau khi bàn bạc, thảo luận, hai bên thống nhất ký kết Hợp đồng thuê thiết bị (sau đây gọi tắt là “Hợp đồng”) với các điều khoản như sau:';

export const CLOSING = 'Hai bên đã đọc kỹ, hiểu rõ toàn bộ nội dung Hợp đồng và đồng ý ký tên dưới đây.';

// Phải khớp với RefundService.calculateRefund (be/src/modules/payments/refund.service.ts).
export const CANCELLATION_POLICY = {
  fullRefundDaysAbove: 7,
  rentalOnlyDaysAbove: 3,
} as const;

export const CATEGORY_NAMES: Record<string, string> = {
  CAMERA_GEAR: 'Máy ảnh và thiết bị quay phim',
  CAMPING: 'Cắm trại',
  TREKKING: 'Trekking và leo núi',
  CAMPING_TREKKING: 'Cắm trại, trekking',
  BEACH: 'Du lịch biển',
  TRAVEL_ESSENTIALS: 'Đồ dùng du lịch',
  FAMILY: 'Gia đình',
};

export const ID_TYPE_NAMES: Record<string, string> = {
  NATIONAL_ID: 'CCCD',
  PASSPORT: 'Hộ chiếu',
  DRIVER_LICENSE: 'Giấy phép lái xe',
};
