import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class WishlistQueryDto extends PaginationQueryDto {}

export class SyncWishlistDto {
  @ApiProperty({ type: [String], maxItems: 100 })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(128, { each: true })
  listingIds!: string[];
}

export class ResolveGuestWishlistDto extends SyncWishlistDto {}

export class WishlistListingParamDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  listingId!: string;
}
