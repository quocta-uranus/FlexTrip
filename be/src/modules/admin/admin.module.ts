import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminUsersController } from './users/admin-users.controller';
import { AdminUsersService } from './users/admin-users.service';
import { AdminListingsController } from './listings/admin-listings.controller';
import { AdminListingsService } from './listings/admin-listings.service';
import { AdminDisputesController } from './disputes/admin-disputes.controller';
import { AdminDisputesService } from './disputes/admin-disputes.service';
import { AdminFinanceController } from './finance/admin-finance.controller';
import { AdminTransactionsService } from './finance/admin-transactions.service';
import { AdminPayoutsService } from './finance/admin-payouts.service';
import { AdminAnalyticsController } from './analytics/admin-analytics.controller';
import { AdminAnalyticsService } from './analytics/admin-analytics.service';
import { AdminConfigController } from './config/admin-config.controller';
import { AdminAuditLogsController } from './audit-logs/admin-audit-logs.controller';
import { AdminAuditLogsService } from './audit-logs/admin-audit-logs.service';
import { AdminStaffController } from './staff/admin-staff.controller';
import { AdminStaffService } from './staff/admin-staff.service';
import { AdminStaffRulesController } from './staff/admin-staff-rules.controller';
import { AdminStaffRulesService } from './staff/admin-staff-rules.service';
import { AdminStaffBookingsController } from './staff/admin-staff-bookings.controller';
import { AdminStaffBookingsService } from './staff/admin-staff-bookings.service';
import { ReviewsModule } from '../reviews/reviews.module';
import { AdminReviewsController } from './reviews/admin-reviews.controller';
import { AdminReviewsService } from './reviews/admin-reviews.service';

@Module({
  imports: [AuthModule, ReviewsModule],
  controllers: [
    AdminUsersController,
    AdminListingsController,
    AdminDisputesController,
    AdminFinanceController,
    AdminAnalyticsController,
    AdminConfigController,
    AdminAuditLogsController,
    AdminStaffController,
    AdminStaffRulesController,
    AdminStaffBookingsController,
    AdminReviewsController,
  ],
  providers: [
    AccessTokenGuard,
    RolesGuard,
    AdminUsersService,
    AdminListingsService,
    AdminDisputesService,
    AdminTransactionsService,
    AdminPayoutsService,
    AdminAnalyticsService,
    AdminAuditLogsService,
    AdminStaffService,
    AdminStaffRulesService,
    AdminStaffBookingsService,
    AdminReviewsService,
  ],
})
export class AdminModule {}
