import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { BookingStatus, DisputePriority, DisputeType, StaffMediationStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsDateString, IsEnum, IsNumber, IsOptional,
  IsString, IsUrl, Length, MaxLength, Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class ListStaffTasksQueryDto {
  @ApiPropertyOptional({ example: '2026-09-29' })
  @IsOptional() @IsDateString()
  date?: string;
}

export class ConfirmConditionDto {
  @ApiProperty() @IsUrl({ require_protocol: true }) photoUrl!: string;
  @ApiProperty() @IsString() @Length(2, 2000) conditionNote!: string;
}

export class CreateMediationDto {
  @ApiProperty() @IsString() @Length(5, 4000) issue!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) travelerStatement?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) providerStatement?: string;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsUrl({ require_protocol: true }, { each: true })
  evidenceUrls?: string[];
}

export class ResolveMediationDto {
  @ApiProperty() @IsString() @Length(5, 4000) resolution!: string;
}

export class EscalateMediationDto {
  @ApiPropertyOptional({ enum: DisputeType, default: DisputeType.DAMAGE_CLAIM })
  @IsOptional() @IsEnum(DisputeType) type?: DisputeType;

  @ApiPropertyOptional({ enum: DisputePriority, default: DisputePriority.HIGH })
  @IsOptional() @IsEnum(DisputePriority) priority?: DisputePriority;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  requestedAmount?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000)
  additionalNotes?: string;
}

export class ListMediationsQueryDto {
  @ApiPropertyOptional({ enum: StaffMediationStatus })
  @IsOptional() @IsEnum(StaffMediationStatus)
  status?: StaffMediationStatus;
}

export class ListMyBookingsQueryDto {
  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional() @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, minimum: 1 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1)
  limit?: number;
}
