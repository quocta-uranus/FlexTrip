import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
} from 'class-validator';
import { KycDocumentType } from '@prisma/client';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class SubmitKycDto {
  @ApiProperty({ example: 'NGUYEN VAN AN' })
  @Transform(trim)
  @IsString()
  @Length(2, 100)
  legalName!: string;

  @ApiProperty({ enum: KycDocumentType })
  @IsEnum(KycDocumentType)
  documentType!: KycDocumentType;

  @ApiProperty({ description: 'Identity document number; encrypted at rest' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Length(4, 50)
  documentNumber!: string;

  @ApiProperty({ description: 'Private object-storage URL for document front' })
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  documentFrontUrl!: string;

  @ApiPropertyOptional({ description: 'Private URL for document back' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  documentBackUrl?: string;

  @ApiProperty({ description: 'Private object-storage URL for selfie' })
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  selfieUrl!: string;
}
