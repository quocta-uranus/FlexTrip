import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min,
} from 'class-validator';

export class AddCartItemDto {
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
}

export class UpdateCartItemDto {
  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsOptional() @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-10-05' })
  @IsOptional() @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ enum: DeliveryMethod })
  @IsOptional() @IsEnum(DeliveryMethod)
  deliveryMethod?: DeliveryMethod;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(300)
  deliveryAddress?: string;
}

export class CheckoutDto {
  @ApiProperty({ example: 'BANK_TRANSFER', description: 'Phương thức thanh toán' })
  @IsString()
  paymentMethod: string;

  @ApiPropertyOptional({ description: 'Mã giao dịch từ cổng thanh toán' })
  @IsOptional() @IsString()
  transactionRef?: string;
}
