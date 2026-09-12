import { IsString, Matches, MinLength, ValidateBy } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ description: '64-character password reset token' })
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  token!: string;

  @ApiProperty({ minLength: 8, description: 'Maximum 72 UTF-8 bytes' })
  @IsString()
  @MinLength(8)
  @ValidateBy({
    name: 'maxPasswordBytes',
    validator: {
      validate: (value: unknown) =>
        typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= 72,
      defaultMessage: () => 'newPassword must not exceed 72 UTF-8 bytes',
    },
  })
  newPassword!: string;
}
