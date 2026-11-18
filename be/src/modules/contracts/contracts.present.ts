import { PrismaService } from '../../prisma/prisma.service';
import { buildAppendices, publicSignature } from './contracts.document';

/**
 * Hợp đồng v2 ở dạng hiển thị cho Staff/Admin: nội dung có cấu trúc, chữ ký (không kèm IP) và phụ lục.
 * Trả null với hợp đồng cũ để màn hình tiếp tục dùng `terms`. Người gọi tự kiểm tra quyền xem booking.
 */
export async function loadPresentedContract(prisma: PrismaService, bookingId: string) {
  const c = await prisma.contract.findUnique({
    where: { bookingId },
    select: {
      contractNo: true, templateVersion: true, content: true, travelerSignature: true, providerSignature: true,
      checkInPhotos: true, checkOutPhotos: true,
      booking: {
        select: {
          checkedInAt: true, checkedOutAt: true, handoverCondition: true, returnCondition: true,
          assignedStaff: { select: { name: true } },
          payment: { select: { refundedAmount: true } },
        },
      },
    },
  });
  if (!c || c.templateVersion !== 2 || !c.content) return null;
  return {
    contractNo: c.contractNo,
    templateVersion: c.templateVersion,
    content: c.content,
    travelerSignature: publicSignature(c.travelerSignature),
    providerSignature: publicSignature(c.providerSignature),
    appendices: buildAppendices({
      checkedInAt: c.booking.checkedInAt, handoverCondition: c.booking.handoverCondition, checkInPhotos: c.checkInPhotos,
      checkedOutAt: c.booking.checkedOutAt, returnCondition: c.booking.returnCondition, checkOutPhotos: c.checkOutPhotos,
      staffName: c.booking.assignedStaff?.name ?? null, refundedAmount: Number(c.booking.payment?.refundedAmount ?? 0),
    }),
  };
}
