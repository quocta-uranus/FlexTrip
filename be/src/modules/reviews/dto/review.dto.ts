import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
