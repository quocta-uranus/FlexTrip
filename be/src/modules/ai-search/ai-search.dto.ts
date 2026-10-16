import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ParseSearchDto {
  @ApiProperty({ maxLength: 200, example: 'lều cho 4 người đi Đà Lạt cuối tuần này, dưới 300k' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  query: string;
}
