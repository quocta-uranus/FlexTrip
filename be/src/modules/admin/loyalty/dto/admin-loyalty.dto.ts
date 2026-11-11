import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { VoucherType } from '@prisma/client';

export class CreateRewardDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(100) name: string;
  @ApiProperty({ description: 'Số điểm cần để đổi' }) @Type(() => Number) @IsInt() @Min(1) pointsCost: number;
  @ApiPropertyOptional({ enum: VoucherType, default: 'FIXED' }) @IsOptional() @IsEnum(VoucherType) voucherType?: VoucherType;
  @ApiProperty({ description: 'FIXED: số tiền VND; PERCENT: 1-100' }) @Type(() => Number) @IsNumber() @Min(1) voucherValue: number;
  @ApiPropertyOptional({ description: 'Bắt buộc với PERCENT' }) @IsOptional() @Type(() => Number) @IsNumber() @Min(1) maxDiscount?: number;
  @ApiPropertyOptional({ default: 30 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(365) validDays?: number;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
}

export class UpdateRewardDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) @MaxLength(100) name?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) pointsCost?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(1) voucherValue?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(1) maxDiscount?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(365) validDays?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
