import { describe, expect, it } from 'vitest';
import { seenCounts, unseenCounts } from './use-admin-sidebar-counts';

const HREF = '/admin/02-provider-registration';

describe('admin sidebar counts', () => {
  it('shows every pending item before the page has ever been opened', () => {
    const seen = seenCounts({ [HREF]: 3 }, {}, '/admin/01-user-accounts');
    expect(unseenCounts({ [HREF]: 3 }, seen)[HREF]).toBe(3);
  });

  it('clears the badge once the admin opens that page', () => {
    const seen = seenCounts({ [HREF]: 3 }, {}, HREF);
    expect(unseenCounts({ [HREF]: 3 }, seen)[HREF]).toBe(0);
  });

  it('keeps it cleared after leaving the page, and counts only newcomers afterwards', () => {
    const stored = seenCounts({ [HREF]: 3 }, {}, HREF);
    const away = seenCounts({ [HREF]: 3 }, stored, '/admin/01-user-accounts');
    expect(unseenCounts({ [HREF]: 3 }, away)[HREF]).toBe(0);
    expect(unseenCounts({ [HREF]: 4 }, away)[HREF]).toBe(1);
  });

  it('lowers the seen mark when items are handled so a later newcomer still shows', () => {
    const stored = { [HREF]: 3 };
    const afterHandling = seenCounts({ [HREF]: 1 }, stored, '/admin');
    expect(afterHandling[HREF]).toBe(1);
    expect(unseenCounts({ [HREF]: 2 }, afterHandling)[HREF]).toBe(1);
  });

  it('does not wipe what was seen while a count is still loading', () => {
    const seen = seenCounts({ [HREF]: undefined }, { [HREF]: 3 }, '/admin');
    expect(seen[HREF]).toBeUndefined();
    expect(unseenCounts({ [HREF]: undefined }, seen)[HREF]).toBe(0);
  });
});
