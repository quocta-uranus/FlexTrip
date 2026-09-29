import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsDateString, IsInt, IsOptional,
  IsPositive, Max, Min, ArrayMinSize, ArrayMaxSize,
} from 'class-validator';

export class BlockDatesDto {
  @ApiProperty({ type: [String], description: 'ISO date strings YYYY-MM-DD', example: ['2026-10-01', '2026-10-02'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(365)
  @IsDateString({}, { each: true })
  dates: string[];

  @ApiPropertyOptional({ description: 'Lý do block (hiển thị nội bộ)' })
  @IsOptional()
  note?: string;
}

export class UnblockDatesDto {
  @ApiProperty({ type: [String], description: 'ISO date strings YYYY-MM-DD' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(365)
  @IsDateString({}, { each: true })
  dates: string[];
}

export class RentalConfigDto {
  @ApiProperty({ minimum: 1, maximum: 365 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  minRentalDays: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 365, description: 'null = không giới hạn' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(365)
  maxRentalDays?: number | null;
}

export class AvailabilityQueryDto {
  @ApiProperty({ description: 'Ngày bắt đầu khoảng xem, YYYY-MM-DD' })
  @IsDateString()
  from: string;

  @ApiProperty({ description: 'Ngày kết thúc khoảng xem, YYYY-MM-DD' })
  @IsDateString()
  to: string;
}

export class CheckAvailabilityDto {
  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiProperty()
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  quantity?: number;
}
