import {
  Body, Controller, Get, Param, Patch, Post, Query, Req, UploadedFile,
  UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { requestContext } from '../../common/request-context';
import { AccessTokenGuard, AuthenticatedRequest } from '../auth/guards/access-token.guard';
import {
  ConfirmConditionDto, CreateMediationDto, EscalateMediationDto,
  ListMediationsQueryDto, ListMyBookingsQueryDto, ListStaffTasksQueryDto, ResolveMediationDto,
} from './dto/staff-operations.dto';
import { StaffOperationsService } from './staff-operations.service';

@ApiTags('staff-operations')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.STAFF)
@Controller('staff')
export class StaffOperationsController {
  constructor(private readonly svc: StaffOperationsService) {}

  @Get('tasks')
  @ApiOperation({ summary: 'STAFF-06: Lịch giao/nhận được phân công' })
  tasks(@Query() query: ListStaffTasksQueryDto, @Req() req: AuthenticatedRequest) {
    return this.svc.tasks(req.authUserId, query);
  }

  @Get('bookings')
  @ApiOperation({ summary: 'STAFF-01: Danh sách tất cả booking được phân công' })
  myBookings(@Query() query: ListMyBookingsQueryDto, @Req() req: AuthenticatedRequest) {
    return this.svc.myBookings(req.authUserId, query);
  }

  @Get('bookings/:id')
  @ApiOperation({ summary: 'STAFF-06: Chi tiết booking được phân công' })
  booking(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.svc.booking(req.authUserId, id);
  }

  @Post('bookings/:id/handover')
  @ApiOperation({ summary: 'STAFF-02: Xác nhận giao thiết bị' })
  handover(
    @Param('id') id: string,
    @Body() dto: ConfirmConditionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.svc.confirmHandover(req.authUserId, id, dto, requestContext(req));
  }

  @Post('bookings/:id/return')
  @ApiOperation({ summary: 'STAFF-03: Xác nhận nhận lại thiết bị' })
  confirmReturn(
    @Param('id') id: string,
    @Body() dto: ConfirmConditionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.svc.confirmReturn(req.authUserId, id, dto, requestContext(req));
  }

  @Get('mediations')
  @ApiOperation({ summary: 'STAFF-04: Danh sách thương lượng tại chỗ' })
  mediations(@Query() query: ListMediationsQueryDto, @Req() req: AuthenticatedRequest) {
    return this.svc.mediations(req.authUserId, query);
  }

  @Post('bookings/:id/mediations')
  @ApiOperation({ summary: 'STAFF-04: Lập phiên thương lượng tại chỗ' })
  createMediation(
    @Param('id') id: string,
    @Body() dto: CreateMediationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.svc.createMediation(req.authUserId, id, dto, requestContext(req));
  }

  @Patch('mediations/:id/resolve')
  @ApiOperation({ summary: 'STAFF-04: Ghi nhận thoả thuận tại chỗ' })
  resolveMediation(
    @Param('id') id: string,
    @Body() dto: ResolveMediationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.svc.resolveMediation(req.authUserId, id, dto, requestContext(req));
  }

  @Post('mediations/:id/escalate')
  @ApiOperation({ summary: 'STAFF-05: Chuyển vụ việc chưa thoả thuận lên Admin' })
  escalate(
    @Param('id') id: string,
    @Body() dto: EscalateMediationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.svc.escalate(req.authUserId, id, dto, requestContext(req));
  }

  @Post('upload-evidence')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'STAFF-02..05: Upload ảnh bằng chứng' })
  upload(@UploadedFile() file: Express.Multer.File) {
    return this.svc.uploadEvidence(file);
  }
}
