import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ProviderSignDto {
  @ApiPropertyOptional({ description: 'Ghi chú tình trạng sản phẩm khi giao' })
  @IsOptional() @IsString()
  conditionNoteOverride?: string;
}

export class InsuranceOptInDto {
  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  insuranceOptIn?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  insuranceRef?: string;
}

export interface PenaltyRule {
  item: string;
  description: string;
  minAmount: number;
  maxAmount: number;
}
