import { Prisma, VoucherAudience, VoucherSource, VoucherStatus, VoucherType } from '@prisma/client';
import { generateVoucherCode } from './voucher-code.util';

export interface PersonalVoucherParams {
  userId: string;
  name: string;
  description: string;
  value: number;
  validDays: number;
  source: VoucherSource;
  codePrefix: string;
  budgetId: string;
  budgetName: string;
}

/**
 * Cấp một voucher giảm cố định, dùng một lần cho đúng một người. Ngân sách chỉ bị trừ khi voucher được dùng,
 * nên tạo voucher khi ngân sách đang cạn vẫn được; lúc áp mã người dùng sẽ thấy lý do hết ngân sách.
 * Là hàm thuần (không phải provider) để module khác dùng được mà không kéo theo phụ thuộc module.
 */
export async function issuePersonalVoucher(tx: Prisma.TransactionClient, p: PersonalVoucherParams) {
  await tx.promoBudget.upsert({
    where: { id: p.budgetId },
    create: { id: p.budgetId, name: p.budgetName, totalAmount: 0 },
    update: {},
  });
  const now = new Date();
  return tx.voucher.create({
    data: {
      code: generateVoucherCode(p.codePrefix),
      name: p.name,
      description: p.description,
      type: VoucherType.FIXED,
      value: p.value,
      audience: VoucherAudience.PERSONAL,
      assignedUserId: p.userId,
      source: p.source,
      status: VoucherStatus.ACTIVE,
      startsAt: now,
      endsAt: new Date(now.getTime() + p.validDays * 86_400_000),
      totalQuota: 1,
      perUserLimit: 1,
      budgetId: p.budgetId,
    },
  });
}
