import { describe, expect, it } from 'vitest';
import {
  normalizeExcelContract,
  normalizeExcelDate,
  normalizeExcelStatus,
} from './excelImportExport';

describe('normalizeExcelDate', () => {
  it('passes through ISO dates', () => {
    expect(normalizeExcelDate('2024-03-15')).toBe('2024-03-15');
  });

  it('reads day-first European formats', () => {
    expect(normalizeExcelDate('15/03/2024')).toBe('2024-03-15');
    expect(normalizeExcelDate('15-03-2024')).toBe('2024-03-15');
    expect(normalizeExcelDate('15.03.2024')).toBe('2024-03-15');
    expect(normalizeExcelDate('5/3/2024')).toBe('2024-03-05');
  });

  it('reads year-first formats', () => {
    expect(normalizeExcelDate('2024/03/15')).toBe('2024-03-15');
  });

  it('reads a Date object as produced by cellDates', () => {
    expect(normalizeExcelDate(new Date('2024-03-15T00:00:00Z'))).toBe('2024-03-15');
  });

  it('reads an Excel serial number', () => {
    // 45366 is 2024-03-15 in the 1900 date system.
    expect(normalizeExcelDate(45366)).toBe('2024-03-15');
  });

  // The regression these tests exist for: a bad date used to silently become
  // today, quietly corrupting the accrual baseline for that employee.
  it.each([null, undefined, '', '  ', 'pas une date', 'N/A', '32/13/2024', 'xx/yy/zzzz'])(
    'returns null rather than defaulting for unusable input: %p',
    (input) => {
      expect(normalizeExcelDate(input)).toBeNull();
    },
  );
});

describe('normalizeExcelStatus', () => {
  it('detects expatriate spellings', () => {
    for (const value of ['EXPAT', 'expatrié', 'Étranger', 'ETRANGER', 'NON LOCAL', 'EXP']) {
      expect(normalizeExcelStatus(value)).toBe('EXPAT');
    }
  });

  it('defaults to local staff', () => {
    expect(normalizeExcelStatus('LOCAL')).toBe('LOCAL');
    expect(normalizeExcelStatus('')).toBe('LOCAL');
    expect(normalizeExcelStatus(undefined)).toBe('LOCAL');
  });
});

describe('normalizeExcelContract', () => {
  it('detects the annual Type B cycle through its aliases', () => {
    for (const value of ['TYPE_B', 'type b', 'Annuel', '12 mois', '12M', '1 an', '365', 'B']) {
      expect(normalizeExcelContract(value)).toBe('TYPE_B');
    }
  });

  it('defaults to the semestrial Type A cycle', () => {
    expect(normalizeExcelContract('TYPE_A')).toBe('TYPE_A');
    expect(normalizeExcelContract('6 mois')).toBe('TYPE_A');
    expect(normalizeExcelContract('')).toBe('TYPE_A');
  });
});
