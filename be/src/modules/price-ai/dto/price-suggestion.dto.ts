import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PriceSuggestionDto {
  @IsString()
  category: string;

  @IsString()
  location: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  currentPrice?: number;

  @IsOptional()
  @IsString()
  listingId?: string;
}

export class RecordPriceDto {
  @IsString()
  listingId: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @IsOptional()
  @IsNumber()
  aiScore?: number;

  @IsOptional()
  @IsString()
  aiReason?: string;
}
