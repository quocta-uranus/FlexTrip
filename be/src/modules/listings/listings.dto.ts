import {
  IsString,
  IsNumber,
  IsPositive,
  IsEnum,
  IsArray,
  IsOptional,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Min,
  Max,
  ArrayMinSize,
  IsInt,
  IsDateString,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export enum ListingCategoryDto {
  CAMERA_GEAR = 'CAMERA_GEAR',
  CAMPING = 'CAMPING',
  TREKKING = 'TREKKING',
  BEACH = 'BEACH',
  TRAVEL_ESSENTIALS = 'TRAVEL_ESSENTIALS',
  FAMILY = 'FAMILY',
}

export enum PublicListingSortDto {
  NEWEST = 'newest',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  RATING = 'rating',
}

@ValidatorConstraint({ name: 'maxPriceNotLessThanMinPrice', async: false })
class MaxPriceNotLessThanMinPriceConstraint implements ValidatorConstraintInterface {
  validate(maxPrice: number | undefined, args: ValidationArguments) {
    const query = args.object as PublicListingsQueryDto;
    return (
      maxPrice === undefined ||
      query.minPrice === undefined ||
      maxPrice >= query.minPrice
    );
  }

  defaultMessage() {
    return 'maxPrice phải lớn hơn hoặc bằng minPrice';
  }
}

@ValidatorConstraint({ name: 'validDateRange', async: false })
class ValidDateRangeConstraint implements ValidatorConstraintInterface {
  private message = 'Khoảng ngày thuê không hợp lệ';

  validate(value: any, args: ValidationArguments) {
    const query = args.object as PublicListingsQueryDto;
    const { dateFrom, dateTo } = query;

    if (!dateFrom && !dateTo) return true;

    if (!dateFrom || !dateTo) {
      this.message = 'Bắt buộc phải cung cấp cả dateFrom và dateTo khi tìm kiếm theo ngày';
      return false;
    }

    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      this.message = 'Định dạng ngày không hợp lệ (YYYY-MM-DD)';
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fromParts = dateFrom.split('-').map(Number);
    if (fromParts.length === 3) {
      const fromMidnight = new Date(fromParts[0], fromParts[1] - 1, fromParts[2]);
      if (fromMidnight < today) {
        this.message = 'Không thể tìm kiếm ngày trong quá khứ';
        return false;
      }
    }

    if (from > to) {
      this.message = 'dateTo phải lớn hơn hoặc bằng dateFrom';
      return false;
    }

    return true;
  }

  defaultMessage() {
    return this.message;
  }
}

export class PublicListingsQueryDto {
  @ApiPropertyOptional({ description: 'Ngày bắt đầu thuê (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString({}, { message: 'dateFrom phải đúng định dạng YYYY-MM-DD' })
  @Validate(ValidDateRangeConstraint)
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Ngày kết thúc thuê (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString({}, { message: 'dateTo phải đúng định dạng YYYY-MM-DD' })
  @Validate(ValidDateRangeConstraint)
  dateTo?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  keyword?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  location?: string;

  @ApiPropertyOptional({ enum: ListingCategoryDto })
  @IsOptional()
  @IsEnum(ListingCategoryDto)
  category?: ListingCategoryDto;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Validate(MaxPriceNotLessThanMinPriceConstraint)
  maxPrice?: number;

  @ApiPropertyOptional({
    enum: PublicListingSortDto,
    default: PublicListingSortDto.NEWEST,
  })
  @IsOptional()
  @IsEnum(PublicListingSortDto)
  sort?: PublicListingSortDto;

  // Kept only for compatibility with older clients. Public queries always
  // enforce ACTIVE in the service and ignore this requested status.
  @ApiPropertyOptional({ deprecated: true })
  @IsOptional()
  @IsString()
  status?: string;
}

export class PenaltyRuleDto {
  @ApiProperty() @IsString() item: string;
  @ApiProperty() @IsString() description: string;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) minAmount: number;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) maxAmount: number;
}

export class CreateListingDto {
  @ApiProperty() @IsString() @MinLength(5) @MaxLength(120) title: string;
  @ApiProperty() @IsString() @MinLength(20) description: string;
  @ApiProperty() @Type(() => Number) @IsNumber() @IsPositive() price: number;
  @ApiPropertyOptional({ default: 'VND' })
  @IsOptional()
  @IsString()
  currency?: string;
  @ApiProperty() @IsString() @MinLength(3) location: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;
  @ApiProperty({ enum: ListingCategoryDto })
  @IsEnum(ListingCategoryDto)
  category: ListingCategoryDto;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  imageUrls: string[];

  // CONTR-02: điều khoản hợp đồng
  @ApiPropertyOptional({ type: [PenaltyRuleDto] })
  @IsOptional()
  @IsArray()
  @Type(() => PenaltyRuleDto)
  penaltyRules?: PenaltyRuleDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  conditionNote?: string;

  // CONTR-05: giá trị cao
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  marketValue?: number;
}

export class UpdateListingDto extends PartialType(CreateListingDto) {}

export class AiSuggestDto {
  @ApiProperty() @IsString() @MinLength(5) title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

export class AiDescriptionDto {
  @ApiProperty() @IsString() @MinLength(3) title: string;
  @ApiProperty({ enum: ListingCategoryDto })
  @IsEnum(ListingCategoryDto)
  category: ListingCategoryDto;
  @ApiProperty() @IsString() location: string;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  amenities?: string[];
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  price?: number;
}

export class AiOptimizeDto {
  @ApiProperty() @IsString() @MinLength(20) description: string;
  @ApiProperty() @IsString() title: string;
  @ApiProperty({ enum: ListingCategoryDto })
  @IsEnum(ListingCategoryDto)
  category: ListingCategoryDto;
}

export class AiQualityDto {
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() description: string;
  @ApiProperty({ enum: ListingCategoryDto })
  @IsEnum(ListingCategoryDto)
  category: ListingCategoryDto;
  @ApiProperty({ type: [String] }) @IsArray() imageUrls: string[];
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  amenities?: string[];
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;
}

export class FlagListingDto {
  @ApiProperty({ example: 'Hình ảnh không đúng thực tế' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
