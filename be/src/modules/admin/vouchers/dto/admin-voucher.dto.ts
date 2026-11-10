import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Matches, MaxLength, Min, MinLength,
} from 'class-validator';
import { VoucherAudience, VoucherSource, VoucherStatus, VoucherType } from '@prisma/client';
import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';

export class CreateVoucherDto {
  @ApiProperty({ example: 'FLEX20K' })
  @IsString() @Matches(/^[A-Za-z0-9_-]{3,32}$/, { message: 'code gồm 3-32 ký tự chữ, số, - hoặc _' })
  code: string;

  @ApiProperty() @IsString() @MinLength(2) @MaxLength(100) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) description?: string;

  @ApiProperty({ enum: VoucherType }) @IsEnum(VoucherType) type: VoucherType;
  @ApiProperty({ description: 'PERCENT: 1-100; FIXED: số tiền VND' })
  @Type(() => Number) @IsNumber() @Min(1) value: number;

  @ApiPropertyOptional({ description: 'Trần giảm cho PERCENT' })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) maxDiscount?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minOrderValue?: number;

  @ApiPropertyOptional({ description: 'Chỉ áp cho một danh mục thiết bị' })
  @IsOptional() @IsString() @MaxLength(50) category?: string;

  @ApiPropertyOptional({ enum: VoucherAudience, default: 'ALL' })
  @IsOptional() @IsEnum(VoucherAudience) audience?: VoucherAudience;

  @ApiPropertyOptional({ description: 'Bắt buộc khi audience = PERSONAL' })
  @IsOptional() @IsString() assignedUserId?: string;

  @ApiPropertyOptional({ enum: VoucherSource, default: 'ADMIN' })
  @IsOptional() @IsEnum(VoucherSource) source?: VoucherSource;

  @ApiPropertyOptional({ enum: VoucherStatus, default: 'DRAFT' })
  @IsOptional() @IsEnum(VoucherStatus) status?: VoucherStatus;

  @ApiProperty() @IsDateString() startsAt: string;
  @ApiProperty() @IsDateString() endsAt: string;

  @ApiPropertyOptional({ description: 'Tổng số lượt dùng; bỏ trống = không giới hạn' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) totalQuota?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) perUserLimit?: number;

  @ApiProperty() @IsString() budgetId: string;
}

export class UpdateVoucherDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) @MaxLength(100) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) description?: string;
  @ApiPropertyOptional({ enum: VoucherStatus }) @IsOptional() @IsEnum(VoucherStatus) status?: VoucherStatus;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startsAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endsAt?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) totalQuota?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) perUserLimit?: number;

  // Đổi mệnh giá khi đã có người dùng sẽ làm lệch số liệu, nên chỉ cho sửa khi chưa có lượt dùng
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(1) value?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(1) maxDiscount?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minOrderValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() budgetId?: string;
}

export class ListVouchersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: VoucherStatus }) @IsOptional() @IsEnum(VoucherStatus) status?: VoucherStatus;
  @ApiPropertyOptional({ enum: VoucherSource }) @IsOptional() @IsEnum(VoucherSource) source?: VoucherSource;
  @ApiPropertyOptional({ description: 'Tìm theo mã hoặc tên' }) @IsOptional() @IsString() search?: string;
}

export class CreatePromoBudgetDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(100) name: string;
  @ApiProperty({ description: 'Tổng ngân sách (VND)' }) @Type(() => Number) @IsNumber() @Min(1) totalAmount: number;
}

export class UpdatePromoBudgetDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) @MaxLength(100) name?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(1) totalAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
