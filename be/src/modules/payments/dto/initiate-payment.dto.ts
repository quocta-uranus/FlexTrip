import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentGateway } from '@prisma/client';

export class InitiatePaymentDto {
  @IsEnum(PaymentGateway)
  gateway: PaymentGateway;

  @IsOptional()
  @IsString()
  returnUrl?: string;

  @IsOptional()
  @IsString()
  cancelUrl?: string;
}
