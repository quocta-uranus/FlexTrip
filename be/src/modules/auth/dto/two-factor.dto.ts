import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TwoFactorCodeDto {
  @ApiProperty({ description: '6-digit TOTP or recovery code' })
  @IsString()
  @Matches(/^(\d{6}|[A-Z0-9]{4}-[A-Z0-9]{4})$/i)
  code!: string;
}

export class TwoFactorLoginDto extends TwoFactorCodeDto {
  @ApiProperty()
  @IsString()
  challengeToken!: string;
}
