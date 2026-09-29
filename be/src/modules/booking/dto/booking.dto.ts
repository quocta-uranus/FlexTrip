import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus, DeliveryMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString, IsEnum, IsIn, IsInt, IsOptional,
  IsString, Max, MaxLength, Min, MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreateBookingDto {
  @ApiProperty() @IsString() listingId: string;

  @ApiProperty({ example: '2026-10-01' }) @IsDateString() startDate: string;
  @ApiProperty({ example: '2026-10-05' }) @IsDateString() endDate: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ enum: DeliveryMethod, default: 'PICKUP' })
  @IsOptional() @IsEnum(DeliveryMethod)
  deliveryMethod?: DeliveryMethod;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(300)
  deliveryAddress?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(500)
  notes?: string;
}

export class ConfirmPaymentDto {
  @ApiProperty({ example: 'BANK_TRANSFER', description: 'Phương thức thanh toán' })
  @IsString()
  method: string;

  @ApiPropertyOptional({ description: 'Mã giao dịch từ cổng thanh toán' })
  @IsOptional() @IsString()
  transactionRef?: string;
}

export class DeclineBookingDto {
  @ApiProperty() @IsString() @MinLength(5) @MaxLength(500)
  reason: string;
}

export class CancelBookingDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(500)
  reason?: string;
}

export class ListBookingsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional() @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({ enum: ['traveler', 'provider'], default: 'traveler' })
  @IsOptional() @IsIn(['traveler', 'provider'])
  as?: 'traveler' | 'provider';
}
