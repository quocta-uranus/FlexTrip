import { IsNumber, IsString, Min, MinLength } from 'class-validator';

export class PayoutRequestDto {
  @IsNumber()
  @Min(100000)
  amount: number;

  @IsString()
  @MinLength(2)
  bankName: string;

  @IsString()
  @MinLength(6)
  bankAccount: string;

  @IsString()
  @MinLength(2)
  accountName: string;

  note?: string;
}
