import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString, IsInt, IsOptional, IsString, MaxLength, Min,
} from 'class-validator';

export class CreateModifyRequestDto {
  @ApiProperty({ example: '2026-11-01' })
  @IsDateString()
  newStartDate: string;

  @ApiProperty({ example: '2026-11-05' })
  @IsDateString()
  newEndDate: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  newQuantity?: number;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional() @IsString() @MaxLength(500)
  reason?: string;
}

export class RespondModifyRequestDto {
  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional() @IsString() @MaxLength(500)
  reason?: string;
}
