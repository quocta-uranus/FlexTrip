import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { ResendService } from '../auth/services/resend.service';
import { ConfigService } from '@nestjs/config';
import { CreateProviderApplicationDto, RejectApplicationDto } from './provider-applications.dto';
import { ApplicationStatus, Role, ShopCategory } from '@prisma/client';

const SETUP_TOKEN_TTL_MS = 48 * 60 * 60 * 1000; // 48h

@Injectable()
export class ProviderApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resend: ResendService,
    private readonly config: ConfigService,
  ) {}

  async submit(dto: CreateProviderApplicationDto) {
    // Prevent duplicate pending application from same email
    const existing = await this.prisma.providerApplication.findFirst({
      where: { email: dto.email, status: ApplicationStatus.PENDING },
    });
    if (existing) {
      throw new ConflictException('Email này đã có đơn đăng ký đang chờ duyệt.');
    }
    return this.prisma.providerApplication.create({ data: dto });
  }

  async list(status?: string) {
    return this.prisma.providerApplication.findMany({
      where: status ? { status: status as ApplicationStatus } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(id: string, adminUserId: string) {
    const app = await this.prisma.providerApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('Không tìm thấy đơn đăng ký.');
    if (app.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException('Đơn đăng ký này đã được xử lý.');
    }

    // Check admin role
    await this.assertAdmin(adminUserId);

    // Check if user with this email already exists
    let user = await this.prisma.user.findUnique({ where: { email: app.email } });

    if (!user) {
      // Create user account — random unusable password until they set their own
      const randomPassword = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
      user = await this.prisma.user.create({
        data: {
          email: app.email,
          name: app.name,
          phone: app.phone,
          password: randomPassword,
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
          roles: { create: { role: Role.PROVIDER } },
          providerProfile: {
            create: {
              shopName: app.name,
              ownerName: app.name,
              pickupAddress: app.city,
              responseHours: '24 giờ',
              category: this.mapCategory(app.categories[0]),
            },
          },
        },
      });
    } else {
      // Add PROVIDER role if not present
      await this.prisma.userRole.upsert({
        where: { userId_role: { userId: user.id, role: Role.PROVIDER } },
        create: { userId: user.id, role: Role.PROVIDER },
        update: {},
      });
    }

    // Generate setup token (plain random hex → send via email, store hash)
    const plainToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(plainToken).digest('hex');
    const expiresAt = new Date(Date.now() + SETUP_TOKEN_TTL_MS);

    await this.prisma.providerSetupToken.upsert({
      where: { userId: user.id },
      create: { userId: user.id, tokenHash, expiresAt },
      update: { tokenHash, expiresAt, usedAt: null },
    });

    // Update application status
    await this.prisma.providerApplication.update({
      where: { id },
      data: { status: ApplicationStatus.APPROVED },
    });

    // Send approval email
    const rawFrontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    // FRONTEND_URL may be comma-separated (shared with CORS config) — take the first value
    const frontendUrl = rawFrontendUrl.split(',')[0].trim();
    const setupUrl = `${frontendUrl}/setup-password?token=${plainToken}`;
    await this.resend.sendProviderApproved(app.email, app.name, setupUrl);

    return { message: 'Đã duyệt và gửi email cho provider.' };
  }

  async reject(id: string, adminUserId: string, dto: RejectApplicationDto) {
    const app = await this.prisma.providerApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('Không tìm thấy đơn đăng ký.');
    if (app.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException('Đơn đăng ký này đã được xử lý.');
    }

    await this.assertAdmin(adminUserId);

    return this.prisma.providerApplication.update({
      where: { id },
      data: { status: ApplicationStatus.REJECTED, adminNote: dto.adminNote },
    });
  }

  private async assertAdmin(userId: string) {
    const role = await this.prisma.userRole.findUnique({
      where: { userId_role: { userId, role: Role.ADMIN } },
    });
    if (!role) throw new ForbiddenException('Chỉ admin mới có quyền thực hiện hành động này.');
  }

  private mapCategory(cat?: string): ShopCategory {
    const valid: ShopCategory[] = ['CAMPING_TREKKING', 'VEHICLE', 'STAY', 'EXPERIENCE', 'OTHER'];
    return (valid.find((v) => v === cat) ?? 'OTHER') as ShopCategory;
  }
}
