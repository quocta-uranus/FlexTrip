import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { ListingCategoryDto } from '../listings/listings.dto';

export const RENTAL_PER_TRIP = 'RENTAL_PER_TRIP';
export const MAX_RENTAL_BUDGET = 99_999_999.99;

export class CreatePreferenceDto {
  @ApiProperty({
    description: 'Loại chuyến đi; giữ tương thích các giá trị cũ',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  tripType!: string;

  @ApiPropertyOptional({ enum: ListingCategoryDto, isArray: true, default: [] })
  @ValidateIf((_, value) => value !== undefined)
  @IsArray()
  @ArrayUnique()
  @IsIn(Object.values(ListingCategoryDto), { each: true })
  preferredCategories?: ListingCategoryDto[];

  @ApiPropertyOptional({
    nullable: true,
    minimum: 0,
    maximum: MAX_RENTAL_BUDGET,
    description: 'VNĐ tiền thuê/chuyến; null để xoá',
  })
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_RENTAL_BUDGET)
  budgetMin?: number | null;

  @ApiPropertyOptional({
    nullable: true,
    minimum: 0,
    maximum: MAX_RENTAL_BUDGET,
  })
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_RENTAL_BUDGET)
  budgetMax?: number | null;

  @ApiPropertyOptional({
    enum: [RENTAL_PER_TRIP],
    nullable: true,
    description:
      'Xác nhận ngân sách tiền thuê/chuyến, chưa gồm cọc và giao hàng',
  })
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsIn([RENTAL_PER_TRIP])
  budgetScope?: typeof RENTAL_PER_TRIP | null;
}

// PATCH skips only undefined; null must still fail for tripType and categories.
export class UpdatePreferenceDto extends PartialType(CreatePreferenceDto, {
  skipNullProperties: false,
}) {}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  oldPassword!: string;

  @ApiProperty()
  @IsString()
  newPassword!: string;
}
