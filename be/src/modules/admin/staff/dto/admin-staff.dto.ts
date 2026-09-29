import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEmail, IsOptional, IsString, Length, Matches, MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';

export class CreateStaffDto {
  @ApiProperty() @IsString() @Length(2, 100) name!: string;

  @ApiProperty() @IsEmail() @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email!: string;

  @ApiPropertyOptional() @IsOptional() @Matches(/^[0-9+\s-]{8,20}$/) phone?: string;

  @ApiProperty({ example: 'EMP-OP-001' }) @Matches(/^[A-Z0-9-]{3,30}$/) employeeCode!: string;

  @ApiProperty({ example: ['TP.HCM'] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10) @IsString({ each: true }) @Length(1, 50, { each: true })
  regions!: string[];
}

export class UpdateStaffDto extends PartialType(OmitType(CreateStaffDto, ['email'] as const)) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ListStaffQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) region?: string;

  @ApiPropertyOptional()
  @IsOptional() @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value)) @IsBoolean()
  isActive?: boolean;
}
