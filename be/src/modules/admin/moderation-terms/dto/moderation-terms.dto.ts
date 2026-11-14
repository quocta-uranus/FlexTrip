import { ApiProperty } from '@nestjs/swagger';
import { ModerationTermCategory } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class AddModerationTermDto {
  @ApiProperty({ maxLength: 60, example: 'đồ ngu dốt' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  term!: string;

  @ApiProperty({ enum: ModerationTermCategory })
  @IsEnum(ModerationTermCategory)
  category!: ModerationTermCategory;
}

export class ToggleBuiltInTermDto {
  @ApiProperty({ maxLength: 60 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  term!: string;

  @ApiProperty({ enum: ModerationTermCategory })
  @IsEnum(ModerationTermCategory)
  category!: ModerationTermCategory;

  @ApiProperty({ description: 'true = tắt từ có sẵn, false = bật lại' })
  @IsBoolean()
  disabled!: boolean;
}

export class TestModerationTextDto {
  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  text!: string;
}
