import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { DateRangeQueryDto } from '../../../../common/dto/date-range.dto';

export const GRANULARITIES = ['day', 'week', 'month'] as const;
export type Granularity = (typeof GRANULARITIES)[number];

export class TimeseriesQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional({ enum: GRANULARITIES, default: 'day' })
  @IsOptional() @IsIn(GRANULARITIES)
  granularity: Granularity = 'day';
}
