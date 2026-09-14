import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  // Lazy connect: không crash app khi DB chưa sẵn sàng
  private connected = false;

  async onModuleInit() {
    try {
      await this.$connect();
      this.connected = true;
    } catch (err) {
      this.logger.warn('Prisma DB not reachable at startup. Will retry on first query.');
    }
  }

  async onModuleDestroy() {
    if (this.connected) await this.$disconnect();
  }

  async ensureConnected() {
    if (!this.connected) {
      await this.$connect();
      this.connected = true;
    }
  }
}
