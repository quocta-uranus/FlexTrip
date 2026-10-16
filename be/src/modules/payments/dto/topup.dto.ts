import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { PaymentGateway } from '@prisma/client';

export class TopupDto {
  @IsNumber()
  @IsPositive()
  @Min(10000)
  amount: number;

  @IsEnum(PaymentGateway)
  gateway: PaymentGateway;

  @IsOptional()
  @IsString()
  returnUrl?: string;
}
