import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { BookingStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';
import { STAFF_REGIONS } from './admin-staff.dto';

export class CreateStaffRuleDto {
  @ApiProperty() @IsString() @Length(1, 100) name!: string;
  @ApiProperty({ enum: STAFF_REGIONS, example: 'Hồ Chí Minh' }) @IsString() @IsIn(STAFF_REGIONS) region!: string;
  @ApiProperty() @IsString() staffId!: string;
  @ApiProperty({ minimum: 0, maximum: 100 }) @IsInt() @Min(0) @Max(100) priority!: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateStaffRuleDto extends PartialType(CreateStaffRuleDto) {}

export class AssignStaffDto {
  @ApiProperty() @IsString() staffId!: string;
}

export class ListAssignableBookingsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional() @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value)) @IsBoolean()
  assigned?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString() staffId?: string;
  @ApiPropertyOptional({ enum: BookingStatus }) @IsOptional() @IsEnum(BookingStatus) status?: BookingStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) search?: string;
}
