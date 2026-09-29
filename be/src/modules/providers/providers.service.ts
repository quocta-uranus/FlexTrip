import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { toAbsoluteUrl } from '../../common/absolute-url.util';

@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: true,
        providerProfile: true,
        wallet: { select: { balance: true, currency: true } },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const isProvider = user.roles.some((r) => r.role === 'PROVIDER');
    if (!isProvider) {
      throw new NotFoundException(
        'Tài khoản này không có vai trò PROVIDER. Vui lòng liên hệ hỗ trợ để được cấp quyền.',
      );
    }

    // Auto-create profile if missing (first-time provider)
    let profile = user.providerProfile;
    if (!profile) {
      profile = await this.prisma.providerProfile.create({
        data: {
          userId,
          shopName: user.name + " Shop",
          ownerName: user.name,
          category: 'OTHER',
          pickupAddress: user.address ?? 'Chưa cập nhật',
          responseHours: '24 giờ',
          highlights: [],
        },
      });
    }

    return {
      ...profile,
      email: user.email,
      phone: user.phone,
      avatarUrl: toAbsoluteUrl(user.avatarUrl),
      wallet: user.wallet,
      // Flatten for convenience
      itemsCount: profile.itemsCount,
      rentalsCount: profile.rentalsCount,
      ratingAvg: Number(profile.ratingAvg),
      reviewsCount: profile.reviewsCount,
      responseTimeH: profile.responseTimeH,
      isLive: profile.isLive,
    };
  }

  async updateMyProfile(userId: string, data: {
    shopName?: string;
    ownerName?: string;
    phone?: string;
    bio?: string;
    avatarUrl?: string;
    category?: string;
    pickupAddress?: string;
    responseHours?: string;
  }) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const isProvider = user.roles.some((r) => r.role === 'PROVIDER');
    if (!isProvider) throw new NotFoundException('Tài khoản này không có vai trò PROVIDER');

    const updatedProfile = await this.prisma.providerProfile.update({
      where: { userId },
      data: {
        shopName: data.shopName,
        ownerName: data.ownerName,
        bio: data.bio,
        category: data.category as any,
        pickupAddress: data.pickupAddress,
        responseHours: data.responseHours,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        phone: data.phone,
        avatarUrl: data.avatarUrl,
      },
    });

    return { success: true, profile: updatedProfile };
  }
}
