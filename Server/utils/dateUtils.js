/**
 * Date and Notice Period Utilities
 * Implements calendar-month arithmetic for notice periods and lease calculations.
 */

/**
 * Accurately adds calendar months to a given date, handling end-of-month day clamping.
 * e.g. Nov 16, 2026 + 2 months => Jan 16, 2027
 * e.g. Jan 31 + 1 month => Feb 28 (or Feb 29 in leap year)
 * 
 * @param {Date|string} date - Base date
 * @param {number} months - Number of calendar months to add
 * @returns {Date} Resulting date
 */
function addCalendarMonths(date, months) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return new Date();

  const originalDay = d.getDate();
  const targetYear = d.getFullYear() + Math.floor((d.getMonth() + months) / 12);
  const normalizedMonth = ((d.getMonth() + months) % 12 + 12) % 12;

  // Maximum days in the destination month
  const maxDaysInTargetMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
  const day = Math.min(originalDay, maxDaysInTargetMonth);

  const result = new Date(targetYear, normalizedMonth, day);
  result.setHours(d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
  return result;
}

/**
 * Evaluates whether a requested move-out date complies with the agreement's notice period.
 * Supports both calendar-month terms (default 2 months) and legacy day-based terms (e.g. 30 days).
 * 
 * @param {Date|string} noticeDate - Date the notice is submitted
 * @param {Date|string} intendedDate - Requested departure date
 * @param {Object} term - Tenancy term object from Rent model
 * @returns {Object} Compliance evaluation result
 */
function evaluateNoticeCompliance(noticeDate, intendedDate, term = {}) {
  const nDate = new Date(noticeDate || Date.now());
  const iDate = new Date(intendedDate);

  // Normalize dates to start of day for fair calendar comparison
  const nStart = new Date(nDate.getFullYear(), nDate.getMonth(), nDate.getDate());
  const iStart = new Date(iDate.getFullYear(), iDate.getMonth(), iDate.getDate());

  // Check if agreement is day-based or month-based
  const isDaysBased = term.noticePeriodUnit === 'days' || (term.noticeDays && term.noticeDays !== 60 && !term.noticePeriodMonths);
  const noticeDays = Number(term.noticeDays) || 60;
  const noticeMonths = Number(term.noticePeriodMonths) || (noticeDays === 30 ? 1 : 2);

  let earliestCompliantDate;
  let requiredNoticeLabel;

  if (isDaysBased && term.noticeDays && term.noticeDays !== 60) {
    earliestCompliantDate = new Date(nStart.getTime() + term.noticeDays * 24 * 60 * 60 * 1000);
    requiredNoticeLabel = `${term.noticeDays} Days (Signed Term)`;
  } else {
    earliestCompliantDate = addCalendarMonths(nStart, noticeMonths);
    requiredNoticeLabel = `${noticeMonths} Calendar Months (Standard)`;
  }

  const meetsRequirement = iStart.getTime() >= earliestCompliantDate.getTime();
  const diffDays = Math.max(0, Math.ceil((iStart.getTime() - nStart.getTime()) / (1000 * 60 * 60 * 24)));

  // Calculate approximate months given
  const monthsGiven = Math.round((diffDays / 30.4375) * 10) / 10;

  return {
    earliestCompliantDate,
    requiredNoticeLabel,
    noticeMonthsRequired: noticeMonths,
    noticeDaysGiven: diffDays,
    noticeMonthsGiven: monthsGiven,
    meetsRequirement,
    isShorterNotice: !meetsRequirement,
    shortNoticeExplanation: !meetsRequirement
      ? `Requested departure date provides ${diffDays} days notice (${monthsGiven} months), which is shorter than the required ${requiredNoticeLabel}. Earliest compliant date is ${earliestCompliantDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}.`
      : ''
  };
}

module.exports = {
  addCalendarMonths,
  evaluateNoticeCompliance
};
