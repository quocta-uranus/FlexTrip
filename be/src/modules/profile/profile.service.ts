import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { uploadImage, deleteFromSupabase } from '../../common/upload.util';

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

  async addPreference(userId: string, dto: any) {
    return this.prisma.travelPreference.create({
      data: {
        userId,
        tripType: dto.tripType,
        budgetMin: dto.budgetMin as any,
        budgetMax: dto.budgetMax as any,
      },
    });
  }

  async updatePreference(userId: string, id: string, dto: any) {
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
  async changePassword(userId: string, dto: any) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const ok = await bcrypt.compare(dto.oldPassword, user.password);
    if (!ok) throw new BadRequestException('Mật khẩu cũ không đúng');

    const password = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { password } });
    await this.prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async setPassword(userId: string, newPassword: string) {
    const password = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { password } });
    return { ok: true };
  }

  async setAvatar(userId: string, avatarUrl: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: { id: true, avatarUrl: true },
    });
  }

  /**
   * Upload avatar lên Supabase Storage, cập nhật User.avatarUrl = public_url,
   * xoá ảnh cũ trên Supabase (nếu là Supabase URL).
   * Trả về URL public — ai cũng xem được, không phụ thuộc localhost.
   */
  async setAvatarFromFile(userId: string, file: Express.Multer.File) {
    // Xoá ảnh cũ trên Supabase (nếu có)
    const old = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    if (old?.avatarUrl && old.avatarUrl.includes('supabase.co')) {
      await deleteFromSupabase(old.avatarUrl);
    }

    // Upload ảnh mới lên Supabase
    const filename = `avatar-${userId}-${Date.now()}.${file.originalname.split('.').pop() || 'jpg'}`;
    const avatarPublicUrl = await uploadImage(file.buffer, filename);

    // Lưu public_url vào DB
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: avatarPublicUrl },
    });

    return {
      userId,
      avatarUrl: avatarPublicUrl,
      avatarPublicUrl,
    };
  }
}
