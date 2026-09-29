import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DisputePriority, DisputeStatus, DisputeType } from '@prisma/client';
import { IsEnum, IsIn, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';

export class ListDisputesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: DisputeStatus }) @IsOptional() @IsEnum(DisputeStatus) status?: DisputeStatus;
  @ApiPropertyOptional({ enum: DisputeType }) @IsOptional() @IsEnum(DisputeType) type?: DisputeType;
  @ApiPropertyOptional({ enum: DisputePriority }) @IsOptional() @IsEnum(DisputePriority) priority?: DisputePriority;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) search?: string;
}

export const OPEN_DISPUTE_STATUSES = ['UNDER_REVIEW', 'PENDING_INFO', 'ESCALATED'] as const;

export class UpdateDisputeStatusDto {
  @ApiProperty({ enum: OPEN_DISPUTE_STATUSES }) @IsIn(OPEN_DISPUTE_STATUSES)
  status!: (typeof OPEN_DISPUTE_STATUSES)[number];

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class UpdateDisputePriorityDto {
  @ApiProperty({ enum: DisputePriority }) @IsEnum(DisputePriority) priority!: DisputePriority;
}

export class ResolveDisputeDto {
  @ApiProperty({ enum: ['RESOLVED', 'REJECTED'] }) @IsIn(['RESOLVED', 'REJECTED'])
  outcome!: 'RESOLVED' | 'REJECTED';

  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(2000)
  resolution!: string;

  @ApiPropertyOptional({ description: 'VND, chỉ khi outcome = RESOLVED' })
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive()
  refundAmount?: number;
}
