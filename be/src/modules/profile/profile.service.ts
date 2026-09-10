import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ChangePasswordDto,
  CreatePreferenceDto,
  UpdatePreferenceDto,
} from './profile.dto';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  // Travel preference ---------------------------------------------------
  async listPreferences(userId: string) {
    return this.prisma.travelPreference.findMany({
      where: { userId },
      orderBy: { id: 'asc' },
    });
  }

  async addPreference(userId: string, dto: CreatePreferenceDto) {
    return this.prisma.travelPreference.create({
      data: {
        userId,
        tripType: dto.tripType,
        budgetMin: dto.budgetMin as any,
        budgetMax: dto.budgetMax as any,
      },
    });
  }

  async updatePreference(userId: string, id: string, dto: UpdatePreferenceDto) {
    return this.prisma.travelPreference.update({
      where: { id },
      data: { ...dto, budgetMin: dto.budgetMin as any, budgetMax: dto.budgetMax as any },
    });
  }

  async deletePreference(userId: string, id: string) {
    await this.prisma.travelPreference.delete({ where: { id } });
    return { ok: true };
  }

  // Password ------------------------------------------------------------
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { userId } });
    if (!user) throw new UnauthorizedException();
    if (!user.passwordHash) {
      throw new BadRequestException('Tài khoản dùng OAuth — hãy set mật khẩu qua Forgot password');
    }
    const ok = await bcrypt.compare(dto.oldPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('Mật khẩu cũ không đúng');

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({ where: { userId }, data: { passwordHash } });
    // Đồng thời revoke mọi session đang active
    await this.prisma.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async setPassword(userId: string, newPassword: string) {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { userId }, data: { passwordHash } });
    return { ok: true };
  }

  async setAvatar(userId: string, avatarUrl: string) {
    return this.prisma.user.update({
      where: { userId },
      data: { avatarUrl },
      select: { userId: true, avatarUrl: true },
    });
  }
}
