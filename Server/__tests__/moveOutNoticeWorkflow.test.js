const { addCalendarMonths, evaluateNoticeCompliance } = require('../utils/dateUtils');

describe('Move-Out Notice Calculation & Agreement Compliance', () => {
  describe('Calendar-Month Arithmetic (addCalendarMonths)', () => {
    it('accurately adds 2 calendar months across standard months', () => {
      const base = new Date('2026-11-16T10:00:00.000Z');
      const result = addCalendarMonths(base, 2);
      expect(result.getFullYear()).toBe(2027);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(16);
    });

    it('handles month-end day clamping (Jan 31 + 1 month => Feb 28)', () => {
      const base = new Date('2026-01-31T10:00:00.000Z');
      const result = addCalendarMonths(base, 1);
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(28); // 2026 is not a leap year
    });

    it('handles leap year month-end day clamping (Jan 31 2028 + 1 month => Feb 29)', () => {
      const base = new Date('2028-01-31T10:00:00.000Z');
      const result = addCalendarMonths(base, 1);
      expect(result.getFullYear()).toBe(2028);
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(29); // 2028 is a leap year
    });
  });

  describe('evaluateNoticeCompliance', () => {
    it('evaluates standard 2-calendar-month agreement: compliant date', () => {
      const noticeDate = new Date('2026-11-16T00:00:00.000Z');
      const requestedDate = new Date('2027-01-16T00:00:00.000Z');
      const term = { noticePeriodMonths: 2, noticeDays: 60, noticePeriodUnit: 'months' };

      const res = evaluateNoticeCompliance(noticeDate, requestedDate, term);
      expect(res.meetsRequirement).toBe(true);
      expect(res.isShorterNotice).toBe(false);
      expect(res.requiredNoticeLabel).toBe('2 Calendar Months (Standard)');
      expect(res.earliestCompliantDate.getFullYear()).toBe(2027);
      expect(res.earliestCompliantDate.getMonth()).toBe(0);
      expect(res.earliestCompliantDate.getDate()).toBe(16);
    });

    it('evaluates standard 2-calendar-month agreement: early/shorter departure flagged', () => {
      const noticeDate = new Date('2026-11-16T00:00:00.000Z');
      const requestedDate = new Date('2026-12-25T00:00:00.000Z'); // Only ~39 days
      const term = { noticePeriodMonths: 2, noticeDays: 60, noticePeriodUnit: 'months' };

      const res = evaluateNoticeCompliance(noticeDate, requestedDate, term);
      expect(res.meetsRequirement).toBe(false);
      expect(res.isShorterNotice).toBe(true);
      expect(res.shortNoticeExplanation).toContain('shorter than the required 2 Calendar Months');
    });

    it('preserves existing historical agreement terms (30-day notice agreement)', () => {
      const noticeDate = new Date('2026-11-16T00:00:00.000Z');
      // 30 days from Nov 16 is Dec 16
      const requestedDateCompliant = new Date('2026-12-16T00:00:00.000Z');
      const term = { noticeDays: 30, noticePeriodUnit: 'days' };

      const res = evaluateNoticeCompliance(noticeDate, requestedDateCompliant, term);
      expect(res.meetsRequirement).toBe(true);
      expect(res.requiredNoticeLabel).toBe('30 Days (Signed Term)');
      expect(res.isShorterNotice).toBe(false);
    });

    it('flags under 30 days for existing 30-day agreement', () => {
      const noticeDate = new Date('2026-11-16T00:00:00.000Z');
      const requestedDateShort = new Date('2026-11-30T00:00:00.000Z'); // 14 days
      const term = { noticeDays: 30, noticePeriodUnit: 'days' };

      const res = evaluateNoticeCompliance(noticeDate, requestedDateShort, term);
      expect(res.meetsRequirement).toBe(false);
      expect(res.isShorterNotice).toBe(true);
      expect(res.requiredNoticeLabel).toBe('30 Days (Signed Term)');
    });
  });
});
