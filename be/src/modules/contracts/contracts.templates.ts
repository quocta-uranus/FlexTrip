import { PenaltyRule } from './dto/contract.dto';

export interface ContractParams {
  contractId: string;
  bookingId: string;
  travelerName: string;
  travelerEmail: string;
  providerName: string;
  providerShopName: string;
  listingTitle: string;
  listingCategory: string;
  listingLocation: string;
  quantity: number;
  startDate: Date;
  endDate: Date;
  rentalDays: number;
  unitPrice: number;
  totalPrice: number;
  depositAmount: number;
  depositRate: number;
  deliveryMethod: string;
  deliveryAddress?: string;
  penaltyRules: PenaltyRule[];
  productConditionNote?: string;
  isHighValue: boolean;
  marketValue?: number;
}

const CATEGORY_NAMES: Record<string, string> = {
  CAMERA_GEAR: 'Máy ảnh & Thiết bị quay phim',
  CAMPING: 'Cắm trại',
  TREKKING: 'Trekking & Leo núi',
  BEACH: 'Du lịch biển',
  TRAVEL_ESSENTIALS: 'Đồ dùng du lịch',
  FAMILY: 'Gia đình',
};

const fmt = (n: number) => n.toLocaleString('vi-VN');
const fmtDate = (d: Date) =>
  d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

export function renderContract(p: ContractParams): string {
  const categoryLabel = CATEGORY_NAMES[p.listingCategory] ?? p.listingCategory;
  const deliveryLabel =
    p.deliveryMethod === 'DELIVERY'
      ? `Giao hàng đến địa chỉ: ${p.deliveryAddress ?? 'chưa xác định'}`
      : `Nhận tại cửa hàng Provider (${p.listingLocation})`;

  const penaltySection =
    p.penaltyRules.length > 0
      ? p.penaltyRules
          .map(
            (r, i) =>
              `  ${i + 1}. ${r.item}: ${r.description}\n     Mức phạt: ${fmt(r.minAmount)}đ – ${fmt(r.maxAmount)}đ`,
          )
          .join('\n')
      : '  (Hai bên thỏa thuận cụ thể khi phát sinh)';

  const conditionSection = p.productConditionNote
    ? `Tình trạng sản phẩm trước khi giao:\n${p.productConditionNote}`
    : 'Tình trạng sản phẩm: được xác nhận đầy đủ khi giao nhận thực tế.';

  const highValueSection = p.isHighValue
    ? `\nLưu ý sản phẩm giá trị cao:\nSản phẩm thuê có giá trị thị trường ước tính ${fmt(p.marketValue ?? 0)}đ. Trong trường hợp mất hoặc hư hỏng toàn bộ không thể phục hồi, Bên B có trách nhiệm bồi thường theo giá trị thị trường tại thời điểm phát sinh.\n`
    : '';

  return `HỢP ĐỒNG THUÊ THIẾT BỊ ĐIỆN TỬ
Số hợp đồng: ${p.contractId.slice(-8).toUpperCase()}
Ngày lập: ${fmtDate(new Date())}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

I. THÔNG TIN CÁC BÊN

Bên cho thuê (Bên A):
  Họ và tên/Tên cửa hàng: ${p.providerShopName} (${p.providerName})
  Nền tảng: FlexTrip

Bên thuê (Bên B):
  Họ và tên: ${p.travelerName}
  Email:     ${p.travelerEmail}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

II. THÔNG TIN THIẾT BỊ THUÊ

  Tên sản phẩm : ${p.listingTitle}
  Danh mục     : ${categoryLabel}
  Địa điểm     : ${p.listingLocation}
  Số lượng     : ${p.quantity} thiết bị
  Mã booking   : ${p.bookingId.slice(-10).toUpperCase()}

${conditionSection}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

III. THỜI GIAN THUÊ & GIÁ

  Ngày bắt đầu : ${fmtDate(p.startDate)}
  Ngày kết thúc : ${fmtDate(p.endDate)}
  Số ngày thuê  : ${p.rentalDays} ngày
  Đơn giá/ngày  : ${fmt(p.unitPrice)}đ/ngày
  Tổng giá trị  : ${fmt(p.totalPrice)}đ
  Đặt cọc       : ${fmt(p.depositAmount)}đ (${Math.round(p.depositRate * 100)}% tổng giá trị)
  Nhận/trả hàng : ${deliveryLabel}
${highValueSection}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IV. BẢNG MỨC PHẠT & BỒI THƯỜNG

${penaltySection}

  Lưu ý chung:
  • Thiệt hại vượt mức phạt tối đa trong bảng trên: hai bên thương lượng hoặc yêu cầu FlexTrip hòa giải.
  • Ảnh tình trạng trước/sau thuê (được chụp và lưu trên hệ thống) là bằng chứng ưu tiên khi xét phạt.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

V. NGHĨA VỤ CỦA BÊN B (NGƯỜI THUÊ)

  1. Sử dụng thiết bị đúng mục đích đã khai báo, không cho người khác thuê lại.
  2. Bảo quản thiết bị cẩn thận, tránh va đập, ẩm ướt, môi trường hóa chất.
  3. Trả thiết bị đúng hạn. Quá hạn không thông báo: tính thêm 150% đơn giá/ngày.
  4. Thông báo ngay khi thiết bị bị hỏng, mất hoặc có sự cố.
  5. Xuất trình CCCD/Passport hợp lệ khi nhận thiết bị.
  6. Upload ảnh tình trạng khi trả thiết bị qua ứng dụng FlexTrip.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VI. NGHĨA VỤ CỦA BÊN A (NGƯỜI CHO THUÊ)

  1. Giao thiết bị đúng tình trạng mô tả, đầy đủ phụ kiện đi kèm.
  2. Chụp ảnh tình trạng trước khi giao và upload lên hệ thống.
  3. Ghi nhận & xác minh CCCD/Passport của Bên B khi giao nhận.
  4. Phản hồi khiếu nại trong vòng 24 giờ.
  5. Không tự ý thay đổi giá, điều kiện sau khi hợp đồng đã được ký.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VII. HOÀN CỌC & THANH TOÁN

  • Hoàn cọc 100%: Bên A từ chối đơn; Bên B hủy trước 3 ngày so với ngày bắt đầu.
  • Không hoàn cọc: Bên B hủy trong vòng 3 ngày trước ngày bắt đầu.
  • Khấu trừ từ cọc: thiệt hại có bằng chứng theo bảng mức phạt tại mục IV.
  • Phần cọc còn lại (nếu có) được hoàn trong 3–5 ngày làm việc sau khi kết thúc thuê.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VIII. GIẢI QUYẾT TRANH CHẤP

  Mọi tranh chấp được ưu tiên giải quyết qua cơ chế hòa giải của FlexTrip trong vòng 7 ngày.
  Trường hợp không đạt thỏa thuận, áp dụng pháp luật Việt Nam, tòa án có thẩm quyền tại địa phương.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IX. ĐIỀU KHOẢN CHUNG

  • Hợp đồng có hiệu lực kể từ khi cả hai bên ký xác nhận trên nền tảng FlexTrip.
  • Nội dung hợp đồng phản ánh thỏa thuận tại thời điểm ký; mọi sửa đổi sau đó cần được cả hai bên đồng ý bằng văn bản.
  • FlexTrip giữ vai trò nền tảng trung gian, không chịu trách nhiệm trực tiếp về chất lượng thiết bị hoặc hành vi vi phạm của một trong hai bên.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hợp đồng này được ký điện tử trên nền tảng FlexTrip, có giá trị pháp lý tương đương hợp đồng bằng giấy theo quy định tại Luật Giao dịch điện tử Việt Nam.`;
}
