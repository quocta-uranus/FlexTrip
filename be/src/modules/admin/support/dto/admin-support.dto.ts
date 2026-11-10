import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';

export class ListTicketsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TicketStatus }) @IsOptional() @IsEnum(TicketStatus) status?: TicketStatus;
  @ApiPropertyOptional({ enum: TicketCategory }) @IsOptional() @IsEnum(TicketCategory) category?: TicketCategory;
  @ApiPropertyOptional({ enum: TicketPriority }) @IsOptional() @IsEnum(TicketPriority) priority?: TicketPriority;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) search?: string;
}

export const REPLY_NEXT_STATUSES = [TicketStatus.IN_PROGRESS, TicketStatus.WAITING_USER, TicketStatus.RESOLVED] as const;

export class AdminReplyDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(4000)
  body!: string;

  @ApiPropertyOptional({ enum: REPLY_NEXT_STATUSES, description: 'Mặc định WAITING_USER' })
  @IsOptional() @IsIn(REPLY_NEXT_STATUSES)
  nextStatus?: (typeof REPLY_NEXT_STATUSES)[number];
}

export class UpdateTicketDto {
  @ApiPropertyOptional({ enum: TicketStatus }) @IsOptional() @IsEnum(TicketStatus) status?: TicketStatus;
  @ApiPropertyOptional({ enum: TicketCategory }) @IsOptional() @IsEnum(TicketCategory) category?: TicketCategory;
  @ApiPropertyOptional({ enum: TicketPriority }) @IsOptional() @IsEnum(TicketPriority) priority?: TicketPriority;
  @ApiPropertyOptional({ description: 'true = nhận xử lý, false = bỏ nhận' }) @IsOptional() @IsBoolean() assignToMe?: boolean;
}

export class FaqDto {
  @ApiProperty() @IsString() @MinLength(5) @MaxLength(200) question!: string;
  @ApiProperty() @IsString() @MinLength(5) @MaxLength(4000) answer!: string;
  @ApiProperty({ enum: TicketCategory }) @IsEnum(TicketCategory) category!: TicketCategory;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isPublished?: boolean;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) @Max(9999) sortOrder?: number;
}

export class UpdateFaqDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(5) @MaxLength(200) question?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(5) @MaxLength(4000) answer?: string;
  @ApiPropertyOptional({ enum: TicketCategory }) @IsOptional() @IsEnum(TicketCategory) category?: TicketCategory;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPublished?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(9999) sortOrder?: number;
}

export class ListFaqsQueryDto {
  @ApiPropertyOptional({ enum: TicketCategory }) @IsOptional() @IsEnum(TicketCategory) category?: TicketCategory;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean() onlyPublished?: boolean;
}
