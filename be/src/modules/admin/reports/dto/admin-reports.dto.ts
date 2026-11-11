import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportFrequency, ReportType } from '@prisma/client';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEmail, IsEnum, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ExportReportQueryDto {
  @ApiProperty({ enum: ReportType }) @IsEnum(ReportType) type!: ReportType;
  @ApiProperty({ example: '2026-09-01' }) @IsISO8601({ strict: true }) from!: string;
  @ApiProperty({ example: '2026-09-30' }) @IsISO8601({ strict: true }) to!: string;
}

export class CreateReportScheduleDto {
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(100) name!: string;
  @ApiProperty({ enum: ReportType }) @IsEnum(ReportType) type!: ReportType;
  @ApiProperty({ enum: ReportFrequency }) @IsEnum(ReportFrequency) frequency!: ReportFrequency;
  @ApiProperty({ type: [String] }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10) @IsEmail({}, { each: true })
  recipients!: string[];
}

export class UpdateReportScheduleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(3) @MaxLength(100) name?: string;
  @ApiPropertyOptional({ enum: ReportType }) @IsOptional() @IsEnum(ReportType) type?: ReportType;
  @ApiPropertyOptional({ enum: ReportFrequency }) @IsOptional() @IsEnum(ReportFrequency) frequency?: ReportFrequency;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10) @IsEmail({}, { each: true })
  recipients?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
