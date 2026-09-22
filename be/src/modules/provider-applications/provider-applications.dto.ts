import { IsEmail, IsNotEmpty, IsOptional, IsString, IsArray, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProviderApplicationDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiProperty() @IsString() @IsNotEmpty() phone: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() @IsNotEmpty() city: string;
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) categories: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

export class RejectApplicationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() adminNote?: string;
}
