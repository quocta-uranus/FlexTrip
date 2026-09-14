import { Transform } from 'class-transformer';
import { IsString, Length, MinLength, ValidateBy } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EmailDto } from './email.dto';

export class RegisterDto extends EmailDto {
  @ApiProperty({ minLength: 2, maxLength: 100 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(2, 100)
  name!: string;

  @ApiProperty({
    minLength: 8,
    description: 'Maximum 72 UTF-8 bytes; never trimmed',
  })
  @IsString()
  @MinLength(8)
  @ValidateBy({
    name: 'maxPasswordBytes',
    validator: {
      validate: (value: unknown) =>
        typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= 72,
      defaultMessage: () => 'password must not exceed 72 UTF-8 bytes',
    },
  })
  password!: string;
}
