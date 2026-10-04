import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength,
  MinLength, ValidateBy,
} from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';

export const STAFF_REGIONS = ['Hà Nội', 'Đà Nẵng', 'Hồ Chí Minh'] as const;

export class CreateStaffDto {
  @ApiProperty() @IsString() @Length(2, 100) name!: string;

  @ApiProperty() @IsEmail() @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email!: string;

  @ApiPropertyOptional() @IsOptional() @Matches(/^[0-9+\s-]{8,20}$/) phone?: string;

  @ApiProperty({ minLength: 8, description: 'Maximum 72 UTF-8 bytes; never trimmed' })
  @IsString()
  @MinLength(8)
  @ValidateBy({
    name: 'maxPasswordBytes',
    validator: {
      validate: (value: unknown) => typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= 72,
      defaultMessage: () => 'password must not exceed 72 UTF-8 bytes',
    },
  })
  password!: string;

  @ApiProperty({ enum: STAFF_REGIONS, isArray: true, example: ['Hà Nội'] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(3) @IsString({ each: true }) @IsIn(STAFF_REGIONS, { each: true })
  regions!: string[];
}

export class UpdateStaffDto extends PartialType(OmitType(CreateStaffDto, ['email', 'password'] as const)) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ListStaffQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) region?: string;

  @ApiPropertyOptional()
  @IsOptional() @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value)) @IsBoolean()
  isActive?: boolean;
}
