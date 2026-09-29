import { ApiProperty, ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { PaymentStatus, PayoutStatus } from '@prisma/client';
import { IsEnum, IsIn, IsNumber, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';
import { DateRangeQueryDto } from '../../../../common/dto/date-range.dto';

export class ListTransactionsQueryDto extends IntersectionType(PaginationQueryDto, DateRangeQueryDto) {
  @ApiPropertyOptional({ enum: PaymentStatus }) @IsOptional() @IsEnum(PaymentStatus) status?: PaymentStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() providerId?: string;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export class GeneratePayoutsDto {
  @ApiProperty({ example: '2026-09-01' }) @Matches(DATE_ONLY) periodStart!: string;
  @ApiProperty({ example: '2026-09-30' }) @Matches(DATE_ONLY) periodEnd!: string;
}

export const RECONCILIATION = ['MATCHED', 'MISMATCH', 'PENDING'] as const;
export type Reconciliation = (typeof RECONCILIATION)[number];

export class ListPayoutsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PayoutStatus }) @IsOptional() @IsEnum(PayoutStatus) status?: PayoutStatus;
  @ApiPropertyOptional({ enum: RECONCILIATION }) @IsOptional() @IsIn(RECONCILIATION) reconciliation?: Reconciliation;
  @ApiPropertyOptional() @IsOptional() @IsString() providerId?: string;
}

export class UpdatePayoutDto {
  @ApiPropertyOptional({ enum: PayoutStatus }) @IsOptional() @IsEnum(PayoutStatus) status?: PayoutStatus;
  @ApiPropertyOptional() @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) actualPaid?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) transferRef?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) note?: string;
}
