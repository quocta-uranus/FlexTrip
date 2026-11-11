import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

export class ValidateVoucherDto {
  @ApiProperty({ example: 'FLEX20K' })
  @IsString() @MaxLength(32) @Matches(/^\S+$/, { message: 'code không được chứa khoảng trắng' })
  code: string;

  @ApiProperty() @IsString() listingId: string;
  @ApiProperty({ example: '2026-12-01' }) @IsDateString() startDate: string;
  @ApiProperty({ example: '2026-12-03' }) @IsDateString() endDate: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  quantity?: number;
}
