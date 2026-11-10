import { PrismaClient, VoucherType } from '@prisma/client';

// Idempotent: chỉ thêm mốc đổi thưởng mẫu khi bảng còn trống, nên không ghi đè mốc admin đã chỉnh.
const prisma = new PrismaClient();

const DEFAULT_REWARDS = [
  { name: 'Voucher 20.000 ₫', pointsCost: 10, voucherValue: 20_000, sortOrder: 1 },
  { name: 'Voucher 70.000 ₫', pointsCost: 30, voucherValue: 70_000, sortOrder: 2 },
];

async function main() {
  if ((await prisma.loyaltyReward.count()) > 0) {
    console.log('LoyaltyReward đã có dữ liệu, bỏ qua.');
    return;
  }
  await prisma.loyaltyReward.createMany({ data: DEFAULT_REWARDS.map((r) => ({ ...r, voucherType: VoucherType.FIXED, validDays: 30 })) });
  console.log(`Đã thêm ${DEFAULT_REWARDS.length} mốc đổi thưởng. Nhớ nạp ngân sách "Đổi điểm thưởng" ở trang Ngân sách khuyến mãi.`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
