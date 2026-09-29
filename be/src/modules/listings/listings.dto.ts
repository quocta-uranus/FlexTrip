import {
  IsString, IsNumber, IsPositive, IsEnum, IsArray,
  IsOptional, IsUrl, IsNotEmpty, MinLength, MaxLength, Min, ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export enum ListingCategoryDto {
  CAMPING_TREKKING = 'CAMPING_TREKKING',
  VEHICLE = 'VEHICLE',
  STAY = 'STAY',
  EXPERIENCE = 'EXPERIENCE',
  OTHER = 'OTHER',
}

export class CreateListingDto {
  @ApiProperty() @IsString() @MinLength(5) @MaxLength(120) title: string;
  @ApiProperty() @IsString() @MinLength(20) description: string;
  @ApiProperty() @Type(() => Number) @IsNumber() @IsPositive() price: number;
  @ApiPropertyOptional({ default: 'VND' }) @IsOptional() @IsString() currency?: string;
  @ApiProperty() @IsString() @MinLength(3) location: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() longitude?: number;
  @ApiProperty({ enum: ListingCategoryDto }) @IsEnum(ListingCategoryDto) category: ListingCategoryDto;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) amenities?: string[];
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) @ArrayMinSize(1) imageUrls: string[];
}

export class UpdateListingDto extends PartialType(CreateListingDto) {}

export class AiSuggestDto {
  @ApiProperty() @IsString() @MinLength(5) title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

export class AiDescriptionDto {
  @ApiProperty() @IsString() @MinLength(3) title: string;
  @ApiProperty({ enum: ListingCategoryDto }) @IsEnum(ListingCategoryDto) category: ListingCategoryDto;
  @ApiProperty() @IsString() location: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() amenities?: string[];
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @IsPositive() price?: number;
}

export class AiOptimizeDto {
  @ApiProperty() @IsString() @MinLength(20) description: string;
  @ApiProperty() @IsString() title: string;
  @ApiProperty({ enum: ListingCategoryDto }) @IsEnum(ListingCategoryDto) category: ListingCategoryDto;
}

export class AiQualityDto {
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() description: string;
  @ApiProperty({ enum: ListingCategoryDto }) @IsEnum(ListingCategoryDto) category: ListingCategoryDto;
  @ApiProperty({ type: [String] }) @IsArray() imageUrls: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() amenities?: string[];
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) price?: number;
}

export class FlagListingDto {
  @ApiProperty({ example: 'Hình ảnh không đúng thực tế' })
  @IsString() @IsNotEmpty() @MaxLength(500)
  reason!: string;
}
