import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { requestContext } from '../../../common/request-context';
import {
  AccessTokenGuard,
  AuthenticatedRequest,
} from '../../auth/guards/access-token.guard';
import { AdminModerationTermsService } from './admin-moderation-terms.service';
import {
  AddModerationTermDto,
  TestModerationTextDto,
  ToggleBuiltInTermDto,
} from './dto/moderation-terms.dto';

@ApiTags('admin-moderation-terms')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/moderation-terms')
export class AdminModerationTermsController {
  constructor(private readonly terms: AdminModerationTermsService) {}

  @Get()
  @ApiOperation({
    summary: 'REVIEW-03: Từ điển lọc nội dung (từ thêm + có sẵn)',
  })
  list() {
    return this.terms.list();
  }

  @Post()
  @ApiOperation({ summary: 'REVIEW-03: Thêm từ vào từ điển lọc' })
  add(@Body() dto: AddModerationTermDto, @Req() req: AuthenticatedRequest) {
    return this.terms.add(dto, requestContext(req, Role.ADMIN));
  }

  @Put('built-in')
  @HttpCode(200)
  @ApiOperation({ summary: 'REVIEW-03: Tắt hoặc bật lại một từ có sẵn' })
  toggleBuiltIn(
    @Body() dto: ToggleBuiltInTermDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.terms.setBuiltInDisabled(dto, requestContext(req, Role.ADMIN));
  }

  @Post('test')
  @HttpCode(200)
  @ApiOperation({ summary: 'REVIEW-03: Thử một câu với từ điển hiện tại' })
  test(@Body() dto: TestModerationTextDto) {
    return this.terms.test(dto.text);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'REVIEW-03: Xóa từ do admin thêm' })
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.terms.remove(id, requestContext(req, Role.ADMIN));
  }
}
