import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';

export const LISTING_TABS = ['FLAGGED', 'ACTIVE', 'SUSPENDED', 'REMOVED', 'ALL'] as const;
export type ListingTab = (typeof LISTING_TABS)[number];
export const MODERATE_ACTIONS = ['HIDE', 'REMOVE', 'RESTORE', 'KEEP'] as const;
export type ModerateAction = (typeof MODERATE_ACTIONS)[number];

export class ListAdminListingsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: LISTING_TABS, default: 'FLAGGED' })
  @IsOptional() @IsIn(LISTING_TABS)
  tab: ListingTab = 'FLAGGED';

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100)
  search?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50)
  category?: string;
}

export class ModerateListingDto {
  @ApiProperty({ enum: MODERATE_ACTIONS }) @IsIn(MODERATE_ACTIONS)
  action!: ModerateAction;

  @ApiPropertyOptional({ description: 'Bắt buộc với HIDE/REMOVE' })
  @ValidateIf((o: ModerateListingDto) => o.action === 'HIDE' || o.action === 'REMOVE' || o.note !== undefined)
  @IsString() @IsNotEmpty() @MaxLength(500)
  note?: string;
}
