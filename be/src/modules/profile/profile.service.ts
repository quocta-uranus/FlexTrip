import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma, TravelPreference } from '@prisma/client';
import {
  CreatePreferenceDto,
  UpdatePreferenceDto,
  RENTAL_PER_TRIP,
  MAX_RENTAL_BUDGET,
} from './profile.dto';
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

  async addPreference(userId: string, dto: CreatePreferenceDto) {
    const min = dto.budgetMin ?? null;
    const max = dto.budgetMax ?? null;
    this.validateBudget(min, max);
    const hasBudget = min !== null || max !== null;
    if (hasBudget && dto.budgetScope === null) {
      throw new BadRequestException(
        'Ngân sách mới phải được xác nhận là tiền thuê/chuyến',
      );
    }
    return this.prisma.travelPreference.create({
      data: {
        userId,
        tripType: dto.tripType,
        preferredCategories: dto.preferredCategories ?? [],
        budgetMin: min === null ? null : new Prisma.Decimal(min),
        budgetMax: max === null ? null : new Prisma.Decimal(max),
        budgetScope: hasBudget ? RENTAL_PER_TRIP : null,
      },
    });
  }

  async updatePreference(userId: string, id: string, dto: UpdatePreferenceDto) {
    const old = await this.prisma.travelPreference.findFirst({
      where: { id, userId },
    });
    if (!old) throw new NotFoundException('Không tìm thấy sở thích');
    const budgetEdited =
      dto.budgetMin !== undefined || dto.budgetMax !== undefined;
    const scopeEdited = dto.budgetScope !== undefined;
    const min = dto.budgetMin !== undefined ? dto.budgetMin : old.budgetMin;
    const max = dto.budgetMax !== undefined ? dto.budgetMax : old.budgetMax;
    const hasBudget = min !== null || max !== null;
    let scope = scopeEdited ? dto.budgetScope : old.budgetScope;

    // Unrelated edits must not reinterpret or reject an invalid legacy budget.
    if (budgetEdited || scopeEdited) {
      this.validateBudget(min, max);
      if (hasBudget) {
        if (
          budgetEdited &&
          old.budgetScope !== RENTAL_PER_TRIP &&
          dto.budgetScope !== RENTAL_PER_TRIP
        ) {
          throw new BadRequestException(
            'Hãy xác nhận ngân sách tiền thuê/chuyến',
          );
        }
        if (
          scopeEdited &&
          dto.budgetScope === null &&
          old.budgetScope === RENTAL_PER_TRIP
        ) {
          throw new BadRequestException(
            'Không thể xoá đơn vị khi còn ngân sách đã xác nhận',
          );
        }
      }
    }
    if (!hasBudget) scope = null;

    const data: Prisma.TravelPreferenceUpdateInput = {};
    if (dto.tripType !== undefined) data.tripType = dto.tripType;
    if (dto.preferredCategories !== undefined)
      data.preferredCategories = dto.preferredCategories;
    if (dto.budgetMin !== undefined)
      data.budgetMin = min === null ? null : new Prisma.Decimal(min);
    if (dto.budgetMax !== undefined)
      data.budgetMax = max === null ? null : new Prisma.Decimal(max);
    if (scopeEdited || budgetEdited || (!hasBudget && old.budgetScope !== null))
      data.budgetScope = scope;
    try {
      return await this.prisma.travelPreference.update({
        where: { id, userId },
        data,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Không tìm thấy sở thích');
      }
      throw error;
    }
  }

  async deletePreference(userId: string, id: string) {
    const result = await this.prisma.travelPreference.deleteMany({
      where: { id, userId },
    });
    if (!result.count) throw new NotFoundException('Không tìm thấy sở thích');
    return { ok: true };
  }

  private validateBudget(
    min: TravelPreference['budgetMin'] | number,
    max: TravelPreference['budgetMax'] | number,
  ) {
    for (const value of [min, max]) {
      if (value === null) continue;
      const amount = new Prisma.Decimal(value);
      if (
        !amount.isFinite() ||
        amount.isNegative() ||
        amount.gt(MAX_RENTAL_BUDGET) ||
        amount.decimalPlaces() > 2
      ) {
        throw new BadRequestException(
          'Ngân sách phải không âm, tối đa 99.999.999,99 và hai chữ số thập phân',
        );
      }
    }
    if (min !== null && max !== null && new Prisma.Decimal(min).gt(max)) {
      throw new BadRequestException(
        'Ngân sách tối thiểu không được lớn hơn tối đa',
      );
    }
  }

  // Password ------------------------------------------------------------
  async changePassword(userId: string, dto: any) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const ok = await bcrypt.compare(dto.oldPassword, user.password);
    if (!ok) throw new BadRequestException('Mật khẩu cũ không đúng');

    const password = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password },
    });
    await this.prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async setPassword(userId: string, newPassword: string) {
    const password = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password },
    });
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
