import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';
import { UpdateUserDto } from './users.dto';
import { toAbsoluteUrl } from '../../common/absolute-url.util';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getMe(userId: string, req?: import('express').Request) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true, kycApplications: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!u) throw new NotFoundException('User not found');
    return this.publicProfile(u, req);
  }

  async updateMe(userId: string, dto: UpdateUserDto, req?: import('express').Request) {
    const { dateOfBirth, ...rest } = dto;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...rest,
        ...(dateOfBirth !== undefined
          ? { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }
          : {}),
      },
    });
    return this.getMe(userId, req);
  }

  async sessions(userId: string) {
    return this.prisma.authSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    const { count } = await this.prisma.authSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count === 0)
      throw new NotFoundException({ code: 'SESSION_NOT_FOUND', message: 'Không tìm thấy phiên đăng nhập.' });
    return { ok: true as const };
  }

  private publicProfile(u: any, req?: import('express').Request) {
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      phone: u.phone ?? null,
      avatarUrl: toAbsoluteUrl(u.avatarUrl, req),
      preferredLanguage: u.preferredLanguage ?? 'vi',
      status: u.status,
      roles: (u.roles ?? []).map((r: { role: Role }) => r.role),
      twoFactorEnabled: u.twoFactorEnabled,
      isKycVerified: u.isKycVerified,
      kycStatus: u.kycApplications?.[0]?.status ?? null,
      createdAt: u.createdAt,
      dateOfBirth: u.dateOfBirth ? (u.dateOfBirth as Date).toISOString().split('T')[0] : null,
      gender: u.gender ?? null,
      nationality: u.nationality ?? null,
      address: u.address ?? null,
      bio: u.bio ?? null,
      emergencyContact: u.emergencyContact ?? null,
      languages: u.languages ?? ['vi'],
    };
  }

  /** @deprecated dùng util chung toAbsoluteUrl từ common/absolute-url.util */
  private toAbsoluteUrl = toAbsoluteUrl;
}
