import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const SINGLETON_ID = 'singleton';

@Injectable()
export class EscrowService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureRow(tx: Prisma.TransactionClient) {
    return tx.platformEscrow.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, balance: 0 },
      update: {},
    });
  }

  /** Credit escrow when traveler pays via wallet */
  async credit(amount: number, tx: Prisma.TransactionClient) {
    await this.ensureRow(tx);
    return tx.platformEscrow.update({
      where: { id: SINGLETON_ID },
      data: { balance: { increment: new Prisma.Decimal(amount) } },
    });
  }

  /** Debit escrow when provider/staff paid out after booking completion */
  async debit(amount: number, tx: Prisma.TransactionClient) {
    await this.ensureRow(tx);
    return tx.platformEscrow.update({
      where: { id: SINGLETON_ID },
      data: { balance: { decrement: new Prisma.Decimal(amount) } },
    });
  }

  async getBalance(): Promise<number> {
    const row = await this.prisma.platformEscrow.findUnique({ where: { id: SINGLETON_ID } });
    return row ? Number(row.balance) : 0;
  }
}
