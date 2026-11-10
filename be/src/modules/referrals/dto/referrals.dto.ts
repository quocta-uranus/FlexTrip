import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReferralStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class ReferralListQueryDto extends PaginationQueryDto {}

export class AdminReferralListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ReferralStatus }) @IsOptional() @IsEnum(ReferralStatus) status?: ReferralStatus;
}
