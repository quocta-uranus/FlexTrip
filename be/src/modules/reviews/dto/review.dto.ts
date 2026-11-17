import { ReviewReportReason } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ example: 'booking_cuid' })
  @IsString()
  @IsNotEmpty()
  bookingId!: string;

  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiProperty({ minLength: 10, maxLength: 2000 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  comment!: string;
}

export class RespondToReviewDto {
  @ApiProperty({ minLength: 1, maxLength: 2000 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  response!: string;
}

export class ReviewSentimentQueryDto {
  @ApiProperty({ enum: ['30', '90', '365'], default: '30' })
  @IsOptional()
  @IsIn(['30', '90', '365'])
  range: '30' | '90' | '365' = '30';

  @ApiProperty({
    required: false,
    description: 'Bắt buộc khi Admin xem dashboard của Provider',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  providerId?: string;
}

export class EditReviewDto extends OmitType(CreateReviewDto, [
  'bookingId',
] as const) {}

export class AppealReviewDto {
  @ApiProperty({ minLength: 10, maxLength: 1000 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  reason!: string;
}

export class ReportReviewDto {
  @ApiProperty({ enum: ReviewReportReason })
  @IsEnum(ReviewReportReason)
  reason!: ReviewReportReason;

  @ApiPropertyOptional({
    maxLength: 1000,
    description: 'Bắt buộc khi lý do là OTHER',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf(
    (dto: ReportReviewDto) =>
      dto.reason === ReviewReportReason.OTHER || dto.details !== undefined,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  details?: string;
}
