import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EmailDto } from './email.dto';

export class LoginDto extends EmailDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  password!: string;
}
