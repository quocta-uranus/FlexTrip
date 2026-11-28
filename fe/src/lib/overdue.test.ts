import { describe, expect, it } from 'vitest';
import { getOverdue } from './overdue';

const rental = { startDate: '2026-11-20T00:00:00.000Z', endDate: '2026-11-25T00:00:00.000Z' };
const at = (iso: string) => new Date(iso);

describe('getOverdue', () => {
  it('is not overdue on the due day in Vietnam time', () => {
    expect(getOverdue({ ...rental, status: 'IN_PROGRESS' }, at('2026-11-25T16:59:00Z'))).toBeNull();
    expect(getOverdue({ ...rental, status: 'CONFIRMED' }, at('2026-11-20T01:00:00Z'))).toBeNull();
  });

  it('counts days from the Vietnamese midnight after the due day', () => {
    expect(getOverdue({ ...rental, status: 'IN_PROGRESS' }, at('2026-11-25T17:00:00Z'))?.label).toBe('Quá hạn trả 1 ngày');
    expect(getOverdue({ ...rental, status: 'CONFIRMED' }, at('2026-11-23T03:00:00Z'))?.label).toBe('Quá hạn bàn giao 3 ngày');
  });

  it('ignores other statuses', () => {
    expect(getOverdue({ ...rental, status: 'COMPLETED' }, at('2026-12-30T00:00:00Z'))).toBeNull();
  });
});
