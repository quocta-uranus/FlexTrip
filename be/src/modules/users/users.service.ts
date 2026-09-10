import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';
import { UpdateUserDto } from './users.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getMe(userId: string) {
    const u = await this.prisma.user.findUnique({
      where: { userId },
      include: { roles: true, twoFactor: true, kycVerifications: true },
    });
    if (!u) throw new NotFoundException('User not found');
    return this.publicProfile(u);
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    await this.prisma.user.update({ where: { userId }, data: dto });
    return this.getMe(userId);
  }

  async addRole(userId: string, role: Role) {
    return this.prisma.userRole.upsert({
      where: { userId_role: { userId, role } },
      create: { userId, role },
      update: {},
    });
  }

  async removeRole(userId: string, role: Role) {
    return this.prisma.userRole.delete({ where: { userId_role: { userId, role } } });
  }

  async sessions(userId: string) {
    return this.prisma.userSession.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    return this.prisma.userSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    }).catch(() => { throw new NotFoundException('Session not found'); });
  }

  private publicProfile(u: any) {
    return {
      userId: u.userId,
      email: u.email,
      fullName: u.fullName,
      phone: u.phone,
      avatarUrl: u.avatarUrl,
      preferredLanguage: u.preferredLanguage,
      status: u.status,
      roles: (u.roles ?? []).map((r: { role: Role }) => r.role),
      twoFactorEnabled: u.twoFactor?.isEnabled ?? false,
      kycStatus: u.kycVerifications?.[0]?.status ?? null,
      createdAt: u.createdAt,
    };
  }
}
