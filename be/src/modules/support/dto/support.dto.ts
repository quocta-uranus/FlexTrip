import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreateTicketDto {
  @ApiProperty({ maxLength: 150 }) @IsString() @MinLength(5) @MaxLength(150)
  subject!: string;

  @ApiProperty({ maxLength: 4000 }) @IsString() @MinLength(10) @MaxLength(4000)
  description!: string;

  @ApiPropertyOptional({ description: 'Booking liên quan (phải là booking của người gửi)' })
  @IsOptional() @IsString() @IsNotEmpty()
  bookingId?: string;
}

export class TicketReplyDto {
  @ApiProperty({ maxLength: 4000 }) @IsString() @IsNotEmpty() @MaxLength(4000)
  body!: string;
}

export class ListMyTicketsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TicketStatus }) @IsOptional() @IsEnum(TicketStatus)
  status?: TicketStatus;
}
