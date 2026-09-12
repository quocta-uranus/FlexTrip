import { ApiPropertyOptional } from '@nestjs/swagger';
import { KycStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class ListKycDto {
  @ApiPropertyOptional({ enum: KycStatus, default: KycStatus.PENDING })
  @IsOptional()
  @IsEnum(KycStatus)
  status?: KycStatus;
}
