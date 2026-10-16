import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

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

export class CheckinDto {
  @ApiProperty({ description: 'URL ảnh CCCD/Passport của traveler (sẽ được mã hóa phía BE)' })
  @IsString() @MinLength(10)
  idDocumentUrl: string;

  @ApiProperty({ enum: ['NATIONAL_ID', 'PASSPORT'] })
  @IsEnum(['NATIONAL_ID', 'PASSPORT'])
  idDocumentType: 'NATIONAL_ID' | 'PASSPORT';

  @ApiProperty({ description: 'Danh sách URL ảnh tình trạng trước khi giao (≥3 ảnh)', isArray: true })
  @IsArray() @IsString({ each: true })
  checkInPhotos: string[];
}

export class CheckoutDto {
  @ApiProperty({ description: 'URL ảnh trả đồ (≥1)', isArray: true })
  @IsArray() @IsString({ each: true })
  photos: string[];

  @ApiPropertyOptional({ description: 'Ghi chú tình trạng khi nhận lại (provider) hoặc khi trả (traveler)' })
  @IsOptional() @IsString()
  note?: string;

  @ApiPropertyOptional({ description: '"complete" → hoàn thành, "dispute" → báo hư hỏng' })
  @IsOptional() @IsEnum(['complete', 'dispute'])
  action?: 'complete' | 'dispute';
}

export interface PenaltyRule {
  item: string;
  description: string;
  minAmount: number;
  maxAmount: number;
}
