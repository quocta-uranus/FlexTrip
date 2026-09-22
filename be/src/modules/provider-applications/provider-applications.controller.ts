import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ProviderApplicationsService } from './provider-applications.service';
import { CreateProviderApplicationDto, RejectApplicationDto } from './provider-applications.dto';
import { AccessTokenGuard, AuthenticatedRequest } from '../auth/guards/access-token.guard';

@ApiTags('provider-applications')
@Controller('provider-applications')
export class ProviderApplicationsController {
  constructor(private readonly svc: ProviderApplicationsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit provider registration form (public)' })
  submit(@Body() dto: CreateProviderApplicationDto) {
    return this.svc.submit(dto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: '[Admin] List all applications' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  list(@Query('status') status?: string) {
    return this.svc.list(status);
  }

  @Patch(':id/approve')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: '[Admin] Approve application → create account + send magic link' })
  approve(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.svc.approve(id, req.authUserId);
  }

  @Patch(':id/reject')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: '[Admin] Reject application' })
  reject(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: RejectApplicationDto,
  ) {
    return this.svc.reject(id, req.authUserId, dto);
  }
}
