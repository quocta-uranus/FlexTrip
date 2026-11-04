import { ReportFrequency, TicketCategory, TicketPriority } from '@prisma/client';
import { triageByRules } from '../../support/ticket-triage.rules';
import { clusterTickets, isCoveredByFaq } from '../support/faq-cluster';
import { nextRunAfter, reportPeriod } from '../reports/report-schedule.util';

describe('SUPPORT-03 rule-based triage', () => {
  it('maps payment issues and escalates refunds', () => {
    const r = triageByRules('Chưa được hoàn tiền', 'Tôi huỷ đơn 3 ngày rồi mà vẫn chưa nhận lại tiền.');
    expect(r.category).toBe(TicketCategory.PAYMENT);
    expect(r.priority).toBe(TicketPriority.HIGH);
  });

  it('flags scam / lost-money wording as urgent', () => {
    const r = triageByRules('Nghi bị lừa đảo', 'Provider yêu cầu chuyển khoản ngoài hệ thống, tôi đã mất tiền.');
    expect(r.priority).toBe(TicketPriority.URGENT);
  });

  it('matches whole words only, so "app" inside "apple" does not mean technical', () => {
    expect(triageByRules('Hỏi về apple', 'Có thuê điện thoại apple không').category).toBe(TicketCategory.OTHER);
    expect(triageByRules('Lỗi đăng nhập', 'Không vào được tài khoản, quên mật khẩu.').category).toBe(TicketCategory.ACCOUNT);
  });

  it('falls back to OTHER / LOW when nothing matches', () => {
    const r = triageByRules('Góp ý', 'Chúc FlexTrip phát triển');
    expect(r).toMatchObject({ category: TicketCategory.OTHER, priority: TicketPriority.LOW });
  });
});

describe('SUPPORT-04 FAQ clustering', () => {
  const t = (id: string, subject: string, category: TicketCategory = TicketCategory.PAYMENT) => ({ id, subject, category });
  const opts = { threshold: 0.34, minSize: 3 };

  it('groups repeated subjects within a category and drops small groups', () => {
    const clusters = clusterTickets(
      [
        t('1', 'Hoàn tiền cọc bao lâu'),
        t('2', 'Bao lâu thì được hoàn tiền cọc'),
        t('3', 'Hoàn tiền cọc khi nào'),
        t('4', 'Quên mật khẩu', TicketCategory.ACCOUNT),
      ],
      opts,
    );
    expect(clusters).toHaveLength(1);
    expect(clusters[0].tickets.map((x) => x.id)).toEqual(['1', '2', '3']);
  });

  it('never merges across categories', () => {
    const clusters = clusterTickets(
      [t('1', 'Hoàn tiền cọc', TicketCategory.PAYMENT), t('2', 'Hoàn tiền cọc', TicketCategory.BOOKING), t('3', 'Hoàn tiền cọc', TicketCategory.PAYMENT)],
      { ...opts, minSize: 2 },
    );
    expect(clusters).toHaveLength(1);
    expect(clusters[0].tickets.map((x) => x.id)).toEqual(['1', '3']);
  });

  it('detects topics an FAQ already covers', () => {
    expect(isCoveredByFaq('Hoàn tiền cọc bao lâu', ['Hoàn tiền cọc mất bao lâu?'], 0.5)).toBe(true);
    expect(isCoveredByFaq('Đổi mật khẩu', ['Hoàn tiền cọc mất bao lâu?'], 0.5)).toBe(false);
  });
});

describe('REPORT-02 schedule timing (Vietnam time)', () => {
  // 2026-11-04 is a Wednesday.
  it('weekly: next Monday 08:00 VN = Monday 01:00 UTC', () => {
    expect(nextRunAfter(ReportFrequency.WEEKLY, new Date('2026-11-04T05:00:00Z')).toISOString()).toBe('2026-11-09T01:00:00.000Z');
  });

  it('weekly: on Monday before 08:00 VN runs the same day, after it waits a week', () => {
    expect(nextRunAfter(ReportFrequency.WEEKLY, new Date('2026-11-08T17:30:00Z')).toISOString()).toBe('2026-11-09T01:00:00.000Z');
    expect(nextRunAfter(ReportFrequency.WEEKLY, new Date('2026-11-09T01:30:00Z')).toISOString()).toBe('2026-11-16T01:00:00.000Z');
  });

  it('monthly: 1st of next month 08:00 VN, including year rollover', () => {
    expect(nextRunAfter(ReportFrequency.MONTHLY, new Date('2026-11-04T05:00:00Z')).toISOString()).toBe('2026-12-01T01:00:00.000Z');
    expect(nextRunAfter(ReportFrequency.MONTHLY, new Date('2026-12-20T05:00:00Z')).toISOString()).toBe('2027-01-01T01:00:00.000Z');
  });

  it('weekly period is the 7 full days before the run, monthly is the previous calendar month', () => {
    expect(reportPeriod(ReportFrequency.WEEKLY, new Date('2026-11-09T01:00:00Z'))).toEqual({ from: '2026-11-02', to: '2026-11-08' });
    expect(reportPeriod(ReportFrequency.MONTHLY, new Date('2027-01-01T01:00:00Z'))).toEqual({ from: '2026-12-01', to: '2026-12-31' });
  });
});
