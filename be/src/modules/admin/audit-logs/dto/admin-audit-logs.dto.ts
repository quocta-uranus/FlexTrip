import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';
import { DateRangeQueryDto } from '../../../../common/dto/date-range.dto';
import { AUDIT_ACTIONS, AUDIT_MODULES } from '../../../audit/audit-actions';

const ACTIONS = Object.keys(AUDIT_ACTIONS);

export class ListAuditLogsQueryDto extends IntersectionType(PaginationQueryDto, DateRangeQueryDto) {
  @ApiPropertyOptional({ enum: AUDIT_MODULES }) @IsOptional() @IsIn(AUDIT_MODULES) module?: string;
  @ApiPropertyOptional({ enum: ACTIONS }) @IsOptional() @IsIn(ACTIONS) action?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() actorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) entityType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() entityId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) search?: string;
}
