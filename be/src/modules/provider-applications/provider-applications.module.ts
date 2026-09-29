import { Module } from '@nestjs/common';
import { ProviderApplicationsController } from './provider-applications.controller';
import { ProviderApplicationsService } from './provider-applications.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ProviderApplicationsController],
  providers: [ProviderApplicationsService],
})
export class ProviderApplicationsModule {}
