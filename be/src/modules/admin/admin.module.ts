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
import { AdminWithdrawService } from './finance/admin-withdraw.service';
import { EscrowService } from '../payments/escrow.service';
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
import { PaymentsModule } from '../payments/payments.module';
import { AdminReviewsController } from './reviews/admin-reviews.controller';
import { AdminReviewsService } from './reviews/admin-reviews.service';
import { AdminBookingsController } from './bookings/admin-bookings.controller';
import { AdminBookingsService } from './bookings/admin-bookings.service';
import { AdminCommissionsController } from './finance/admin-commissions.controller';
import { AdminCommissionsService } from './finance/admin-commissions.service';
import { AdminModerationTermsController } from './moderation-terms/admin-moderation-terms.controller';
import { AdminModerationTermsService } from './moderation-terms/admin-moderation-terms.service';
import { BullModule } from '@nestjs/bullmq';
import { SupportModule } from '../support/support.module';
import { AdminTicketsController } from './support/admin-tickets.controller';
import { AdminTicketsService } from './support/admin-tickets.service';
import { AdminFaqsController } from './support/admin-faqs.controller';
import { AdminFaqsService } from './support/admin-faqs.service';
import { AdminReportsController } from './reports/admin-reports.controller';
import { AdminReportsService } from './reports/admin-reports.service';
import { AdminReportSchedulesService } from './reports/admin-report-schedules.service';
import { ReportScheduleProcessor } from './reports/report-schedule.processor';
import { ReportsService } from './reports/reports.service';
import { REPORT_SCHEDULE_QUEUE } from './reports/report-schedule.constants';
import { AdminVouchersController } from './vouchers/admin-vouchers.controller';
import { AdminVouchersService } from './vouchers/admin-vouchers.service';
import { AdminLoyaltyController } from './loyalty/admin-loyalty.controller';
import { AdminLoyaltyService } from './loyalty/admin-loyalty.service';
import { AdminReferralsController } from './referrals/admin-referrals.controller';
import { AdminReferralsService } from './referrals/admin-referrals.service';

@Module({
  imports: [AuthModule, ReviewsModule, PaymentsModule, SupportModule, BullModule.registerQueue({ name: REPORT_SCHEDULE_QUEUE })],
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
    AdminBookingsController,
    AdminCommissionsController,
    AdminModerationTermsController,
    AdminTicketsController,
    AdminFaqsController,
    AdminReportsController,
    AdminVouchersController,
    AdminLoyaltyController,
    AdminReferralsController,
  ],
  providers: [
    AccessTokenGuard,
    RolesGuard,
    AdminUsersService,
    AdminListingsService,
    AdminDisputesService,
    AdminTransactionsService,
    AdminPayoutsService,
    AdminWithdrawService,
    EscrowService,
    AdminAnalyticsService,
    AdminAuditLogsService,
    AdminStaffService,
    AdminStaffRulesService,
    AdminStaffBookingsService,
    AdminReviewsService,
    AdminBookingsService,
    AdminCommissionsService,
    AdminModerationTermsService,
    AdminTicketsService,
    AdminFaqsService,
    ReportsService,
    AdminReportsService,
    AdminReportSchedulesService,
    ReportScheduleProcessor,
    AdminVouchersService,
    AdminLoyaltyService,
    AdminReferralsService,
  ],
})
export class AdminModule {}
