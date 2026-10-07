import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { StaffOperationsController } from './staff-operations.controller';
import { StaffOperationsService } from './staff-operations.service';

@Module({
  imports: [AuthModule],
  controllers: [StaffOperationsController],
  providers: [AccessTokenGuard, RolesGuard, StaffOperationsService],
})
export class StaffModule {}
