import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({ description: '64-character verification token from email' })
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  token!: string;
}
