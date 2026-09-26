import { describe, it, expect } from 'vitest';
import { 
  normalizeExcelDate, 
  normalizeStatus, 
  normalizeContractType 
} from '../utils/excelImportExport';

describe('excelImportExport - Data Normalization Utilities', () => {
  it('should normalize string dates in YYYY-MM-DD format', () => {
    expect(normalizeExcelDate('2024-05-20')).toBe('2024-05-20');
  });

  it('should normalize French formatted dates (DD/MM/YYYY)', () => {
    expect(normalizeExcelDate('15/08/2023')).toBe('2023-08-15');
    expect(normalizeExcelDate('01/01/2022')).toBe('2022-01-01');
  });

  it('should normalize Date objects correctly', () => {
    const d = new Date(Date.UTC(2023, 10, 5));
    expect(normalizeExcelDate(d)).toBe('2023-11-05');
  });

  it('should normalize Excel serial date numbers', () => {
    // 45000 in Excel serial date format is ~ March 2023
    const result = normalizeExcelDate(45000);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should normalize employee status strings (LOCAL vs EXPAT)', () => {
    expect(normalizeStatus('LOCAL')).toBe('LOCAL');
    expect(normalizeStatus('Personnel Local')).toBe('LOCAL');
    expect(normalizeStatus('local')).toBe('LOCAL');
    expect(normalizeStatus('EXPAT')).toBe('EXPAT');
    expect(normalizeStatus('Expatrié')).toBe('EXPAT');
    expect(normalizeStatus('expatrie')).toBe('EXPAT');
    expect(normalizeStatus('Etranger')).toBe('EXPAT');
  });

  it('should normalize contract type strings (TYPE_A vs TYPE_B)', () => {
    expect(normalizeContractType('TYPE_A')).toBe('TYPE_A');
    expect(normalizeContractType('Type A')).toBe('TYPE_A');
    expect(normalizeContractType('6 mois')).toBe('TYPE_A');
    expect(normalizeContractType('A')).toBe('TYPE_A');
    expect(normalizeContractType('TYPE_B')).toBe('TYPE_B');
    expect(normalizeContractType('Type B')).toBe('TYPE_B');
    expect(normalizeContractType('12 mois')).toBe('TYPE_B');
    expect(normalizeContractType('1 an')).toBe('TYPE_B');
    expect(normalizeContractType('B')).toBe('TYPE_B');
  });
});
