import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AccessTokenGuard,
  AuthenticatedRequest,
} from '../auth/guards/access-token.guard';
import { ListKycDto, ReviewKycDto, SubmitKycDto } from './dto';
import { KycService } from './kyc.service';
import { requestContext } from '../../common/request-context';
import { Role } from '@prisma/client';

@ApiTags('kyc')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('kyc')
export class KycController {
  constructor(private readonly kyc: KycService) {}

  @Post('applications')
  @ApiOperation({
    summary: 'AUTH-05: Traveler submits a Provider KYC application',
  })
  submit(@Req() request: AuthenticatedRequest, @Body() dto: SubmitKycDto) {
    return this.kyc.submit(request.authUserId, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'AUTH-05: Get current user KYC status' })
  getMine(@Req() request: AuthenticatedRequest) {
    return this.kyc.getMine(request.authUserId);
  }

  @Get('applications')
  @ApiOperation({ summary: 'AUTH-05: Admin lists KYC applications' })
  list(@Req() request: AuthenticatedRequest, @Query() query: ListKycDto) {
    return this.kyc.listForAdmin(request.authUserId, query.status);
  }

  @Patch('applications/:id/review')
  @HttpCode(200)
  @ApiOperation({ summary: 'AUTH-05: Admin approves or rejects KYC' })
  review(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ReviewKycDto,
  ) {
    return this.kyc.review(request.authUserId, id, dto, requestContext(request, Role.ADMIN));
  }
}
