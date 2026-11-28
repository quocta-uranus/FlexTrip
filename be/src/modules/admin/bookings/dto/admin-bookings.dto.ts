import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';

export class ListAdminBookingsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional() @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  staffId?: string;

  @ApiPropertyOptional({ description: 'true = đã có staff, false = chưa có' })
  @IsOptional() @Type(() => Boolean) @IsBoolean()
  hasStaff?: boolean;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional() @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional() @IsString()
  to?: string;

  @ApiPropertyOptional({ enum: ['true', 'false'], description: 'Chỉ lấy đơn quá hạn bàn giao hoặc quá hạn trả' })
  @IsOptional() @IsIn(['true', 'false'])
  overdue?: 'true' | 'false';
}

export const HANDOVER_FAULTS = ['TRAVELER_NO_SHOW', 'PROVIDER_FAULT', 'PLATFORM_FAULT'] as const;
export type HandoverFault = (typeof HANDOVER_FAULTS)[number];

export class ResolveOverdueHandoverDto {
  @ApiProperty({ enum: HANDOVER_FAULTS })
  @IsIn(HANDOVER_FAULTS)
  fault!: HandoverFault;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(500)
  note?: string;
}
