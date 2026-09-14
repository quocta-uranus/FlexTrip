import { ApiProperty } from '@nestjs/swagger';
import { IsDecimal, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePreferenceDto {
  @ApiProperty({ description: 'Loại chuyến đi (beach, mountain, adventure...)' })
  @IsString()
  tripType!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  budgetMin?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  budgetMax?: number;
}

export class UpdatePreferenceDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tripType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  budgetMin?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  budgetMax?: number;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  oldPassword!: string;

  @ApiProperty()
  @IsString()
  newPassword!: string;
}
