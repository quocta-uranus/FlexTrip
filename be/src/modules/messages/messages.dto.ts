import { MessageType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsEnum, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl,
  Max, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { MAX_FILES, MAX_FILE_BYTES } from './attachment-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class StartConversationDto {
  @IsString() @IsNotEmpty()
  targetUserId!: string;
}

export class AttachmentInputDto {
  @IsUrl({ require_tld: false, require_protocol: true, protocols: ['http', 'https'] })
  url!: string;

  @IsString() @IsNotEmpty() @MaxLength(255)
  name!: string;

  @IsString() @IsNotEmpty()
  mimeType!: string;

  @IsInt() @Min(1) @Max(MAX_FILE_BYTES)
  size!: number;
}

export class SendMessageDto {
  @IsEnum(MessageType)
  type!: MessageType;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(4000)
  content?: string;

  @IsOptional() @IsString() @IsNotEmpty()
  replyToId?: string;

  @IsOptional() @IsArray() @ArrayMaxSize(MAX_FILES) @ValidateNested({ each: true }) @Type(() => AttachmentInputDto)
  attachments?: AttachmentInputDto[];

  @IsOptional() @IsNumber() @Min(-90) @Max(90)
  latitude?: number;

  @IsOptional() @IsNumber() @Min(-180) @Max(180)
  longitude?: number;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(200)
  locationLabel?: string;
}

export class EditMessageDto {
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(4000)
  content!: string;
}

export class MessagesQueryDto {
  @IsOptional() @IsString() @IsNotEmpty()
  cursor?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit: number = 30;
}

export class SharedQueryDto extends MessagesQueryDto {
  @IsIn(['media', 'files', 'links'])
  kind!: 'media' | 'files' | 'links';
}
