import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: { email: string; password: string; name: string; role?: string }) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already in use');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { email: dto.email, password: hashed, name: dto.name, role: (dto.role as any) ?? 'TRAVELER' },
    });

    return this.signTokens(user.id, user.email, user.role);
  }

  async login(dto: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const match = await bcrypt.compare(dto.password, user.password);
    if (!match) throw new UnauthorizedException('Invalid credentials');

    return this.signTokens(user.id, user.email, user.role);
  }

  async refresh(token: string) {
    try {
      const payload = this.jwt.verify(token, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
      return this.signTokens(payload.sub, payload.email, payload.role);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async signTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload),
      this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES', '7d'),
      }),
    ]);

    await this.prisma.user.update({ where: { id: userId }, data: { refreshToken } });
    return { accessToken, refreshToken };
  }
}
