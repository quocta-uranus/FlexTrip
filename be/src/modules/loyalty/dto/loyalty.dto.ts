import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class RedeemRewardDto {
  @ApiProperty() @IsString() rewardId: string;
}

export class LoyaltyTransactionsQueryDto extends PaginationQueryDto {}
