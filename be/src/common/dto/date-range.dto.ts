import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';

export class DateRangeQueryDto {
  @ApiPropertyOptional({ example: '2026-09-01' }) @IsOptional() @IsISO8601({ strict: true })
  from?: string;

  @ApiPropertyOptional({ example: '2026-09-30' }) @IsOptional() @IsISO8601({ strict: true })
  to?: string;
}

const DAY = 24 * 3600_000;
// Business dates are Vietnam local days (Asia/Ho_Chi_Minh has no DST).
const VN = '+07:00';

function startOfDay(s: string) { return new Date(`${s.slice(0, 10)}T00:00:00.000${VN}`); }
function endOfDay(s: string) { return new Date(`${s.slice(0, 10)}T23:59:59.999${VN}`); }

export function startOfTodayVn(): Date {
  const vnNow = new Date(Date.now() + 7 * 3600_000);
  return startOfDay(vnNow.toISOString());
}

/** Inclusive date range plus the immediately preceding range of equal length. */
export function resolveRange(q: DateRangeQueryDto, defaultDays: number) {
  const to = q.to ? endOfDay(q.to) : new Date();
  const from = q.from ? startOfDay(q.from) : new Date(to.getTime() - defaultDays * DAY);
  const length = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - length);
  return { from, to, prevFrom, prevTo };
}
