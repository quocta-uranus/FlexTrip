import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { AuditModule } from './modules/audit/audit.module';
import { SystemConfigModule } from './modules/system-config/system-config.module';
import { AuthModule } from './modules/auth/auth.module';
import { KycModule } from './modules/kyc/kyc.module';
import { UsersModule } from './modules/users/users.module';
import { ProfileModule } from './modules/profile/profile.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { ProviderApplicationsModule } from './modules/provider-applications/provider-applications.module';
import { ListingsModule } from './modules/listings/listings.module';
import { AiChatModule } from './modules/ai-chat/ai-chat.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    AuditModule,
    SystemConfigModule,
    AuthModule,
    KycModule,
    UsersModule,
    ProfileModule,
    ProvidersModule,
    ProviderApplicationsModule,
    ListingsModule,
    AiChatModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
