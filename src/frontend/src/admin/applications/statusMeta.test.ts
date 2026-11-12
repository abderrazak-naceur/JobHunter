import { describe, expect, it } from 'vitest';
import { APPLICATION_STATUSES } from '@/services/applicationApi';
import { formatDate, isOverdue, statusLabel, statusMeta, todayIso } from './statusMeta';

describe('statusMeta', () => {
  it('has a label and colours for every status the API knows', () => {
    for (const status of APPLICATION_STATUSES) {
      expect(statusMeta[status].label).toBeTruthy();
      expect(statusMeta[status].className).toContain('bg-');
    }
    expect(Object.keys(statusMeta)).toHaveLength(APPLICATION_STATUSES.length);
  });

  it('translates known statuses and leaves unknown ones as they are', () => {
    expect(statusLabel('Interview')).toBe('Colloquio');
    expect(statusLabel('Archived')).toBe('Archived');
  });
});

describe('dates', () => {
  it('formats yyyy-MM-dd as dd/MM/yyyy', () => {
    expect(formatDate('2026-11-03')).toBe('03/11/2026');
    expect(formatDate('2026-11-03T10:20:30Z')).toBe('03/11/2026');
  });

  it('shows a dash for empty dates', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('')).toBe('—');
  });

  it('builds today as yyyy-MM-dd using the local calendar day', () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(todayIso(new Date(2026, 11, 31, 0, 0))).toBe('2026-12-31');
  });

  it('flags only dates before today as overdue', () => {
    expect(isOverdue('2026-11-11', '2026-11-12')).toBe(true);
    expect(isOverdue('2026-11-12', '2026-11-12')).toBe(false);
    expect(isOverdue('2026-11-13', '2026-11-12')).toBe(false);
    expect(isOverdue(null, '2026-11-12')).toBe(false);
  });
});
