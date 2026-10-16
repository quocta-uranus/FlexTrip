import { IsNumberString } from 'class-validator';

export class ConfirmPayosDto {
  @IsNumberString()
  orderCode!: string;
}
