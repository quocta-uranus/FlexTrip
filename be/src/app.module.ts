import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
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
import { AvailabilityModule } from './modules/availability/availability.module';
import { BookingModule } from './modules/booking/booking.module';
import { CartModule } from './modules/cart/cart.module';
import { ModifyBookingModule } from './modules/modify-booking/modify-booking.module';
import { AiChatModule } from './modules/ai-chat/ai-chat.module';
import { AiSearchModule } from './modules/ai-search/ai-search.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { AdminModule } from './modules/admin/admin.module';
import { StaffModule } from './modules/staff/staff.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { ReputationModule } from './modules/reputation/reputation.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { PriceAiModule } from './modules/price-ai/price-ai.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PaymentAiModule } from './modules/payment-ai/payment-ai.module';
import { PublicStatsModule } from './modules/public-stats/public-stats.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
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
    AvailabilityModule,
    BookingModule,
    CartModule,
    ModifyBookingModule,
    AiChatModule,
    AiSearchModule,
    RecommendationsModule,
    AdminModule,
    StaffModule,
    NotificationsModule,
    ReviewsModule,
    ReputationModule,
    ContractsModule,
    WishlistModule,
    PriceAiModule,
    PaymentsModule,
    PaymentAiModule,
    PublicStatsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
