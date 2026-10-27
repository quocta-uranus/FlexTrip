import { ApiProperty } from '@nestjs/swagger';

export class PublicStatsDto {
  @ApiProperty({
    description: 'Số lượng thiết bị đang sẵn sàng cho thuê',
    example: 48,
  })
  activeListings!: number;

  @ApiProperty({
    description: 'Số lượng đối tác cho thuê đã được duyệt',
    example: 16,
  })
  approvedProviders!: number;

  @ApiProperty({ description: 'Số lượng chuyến đi hoàn tất', example: 120 })
  completedBookings!: number;

  @ApiProperty({ description: 'Điểm đánh giá trung bình', example: 4.9 })
  averageRating!: number;

  @ApiProperty({
    description: 'Tổng số lượt đánh giá đã công khai',
    example: 85,
  })
  publishedReviews!: number;
}

export class FeaturedReviewDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  rating!: number;

  @ApiProperty({ nullable: true })
  comment!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  authorName!: string;

  @ApiProperty({ nullable: true })
  authorAvatarUrl!: string | null;

  @ApiProperty({ nullable: true })
  listingTitle!: string | null;
}
