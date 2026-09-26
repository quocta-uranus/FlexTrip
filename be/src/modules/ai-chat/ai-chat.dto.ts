import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AiChatDto {
  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @MinLength(1)
  @MaxLength(2_000)
  message: string;

  @ApiPropertyOptional({ description: 'Existing AI conversation id' })
  @IsOptional()
  @IsString()
  conversationId?: string;
}
