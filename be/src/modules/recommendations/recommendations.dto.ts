import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ListingCategoryDto } from '../listings/listings.dto';

export class RecordSearchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string;

  @ApiPropertyOptional({ enum: ListingCategoryDto })
  @IsOptional()
  @IsEnum(ListingCategoryDto)
  category?: ListingCategoryDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;
}
