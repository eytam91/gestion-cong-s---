import { describe, it, expect } from 'vitest';
import { 
  DailyAccrualRates, 
  parseDateToMidnightUtc, 
  formatLocalDate, 
  calculateEmployeeStats 
} from '../utils/vacationCalc';
import { Employee, LeaveRecord } from '../types';

describe('vacationCalc - Accrual Rates and Helpers', () => {
  it('should have correct daily accrual rates for Type A and Type B', () => {
    // Type A: 30 days acquired across 5 months of work (152.5 days)
    expect(DailyAccrualRates.TYPE_A).toBeCloseTo(0.19672, 4);

    // Type B: 30 days acquired across 11 months of work (335 days)
    expect(DailyAccrualRates.TYPE_B).toBeCloseTo(0.08955, 4);
  });

  it('should parse ISO date strings to UTC midnight timestamp', () => {
    const ts = parseDateToMidnightUtc('2024-03-15');
    const expected = Date.UTC(2024, 2, 15);
    expect(ts).toBe(expected);
  });

  it('should format dates to French locale string', () => {
    const formatted = formatLocalDate('2024-03-15');
    expect(formatted).toBe('15/03/2024');
  });
});

describe('vacationCalc - Employee Stats Calculation', () => {
  const baseEmployee: Employee = {
    id: 'emp-test-1',
    idNumber: 'MAT-001',
    name: 'Karim Alami',
    position: 'Ingénieur',
    status: 'LOCAL',
    hireDate: '2024-01-01',
    contractType: 'TYPE_A',
    createdAt: '2024-01-01T00:00:00.000Z',
  };

  it('should compute accrued days correctly without any leave taken', () => {
    const targetDate = new Date('2024-06-01T00:00:00.000Z');
    const stats = calculateEmployeeStats(baseEmployee, [], targetDate);

    expect(stats.daysSinceHire).toBeGreaterThan(150);
    expect(stats.totalAccruedDays).toBeGreaterThan(25);
    expect(stats.totalLeaveTakenDays).toBe(0);
    expect(stats.balanceDays).toBeCloseTo(stats.totalAccruedDays, 1);
    expect(stats.isDebt).toBe(false);
    expect(stats.debtDays).toBe(0);
  });

  it('should subtract leave taken from balance and detect debt if exceeded', () => {
    const targetDate = new Date('2024-03-01T00:00:00.000Z');
    // Embauche 2024-01-01 -> 60 jours écoulés ~ 11.8 jours acquis
    // Prise de 20 jours de congé payé -> solde négatif
    const leaves: LeaveRecord[] = [
      {
        id: 'rec-1',
        employeeId: 'emp-test-1',
        startDate: '2024-02-01',
        endDate: '2024-02-20',
        daysCount: 20,
        leaveType: 'CONGE_PAYE',
        isPaid: true,
        createdAt: '2024-02-01T00:00:00.000Z',
      }
    ];

    const stats = calculateEmployeeStats(baseEmployee, leaves, targetDate);

    expect(stats.totalLeaveTakenDays).toBe(20);
    expect(stats.balanceDays).toBeLessThan(0);
    expect(stats.isDebt).toBe(true);
    expect(stats.debtDays).toBeGreaterThan(0);
    expect(stats.daysToPayback).toBeGreaterThan(0);
  });

  it('should separate unpaid leave from paid leave consumption', () => {
    const targetDate = new Date('2024-06-01T00:00:00.000Z');
    const leaves: LeaveRecord[] = [
      {
        id: 'rec-unpaid',
        employeeId: 'emp-test-1',
        startDate: '2024-02-01',
        endDate: '2024-02-05',
        daysCount: 5,
        leaveType: 'AUTRE',
        isPaid: false,
        createdAt: '2024-02-01T00:00:00.000Z',
      },
      {
        id: 'rec-paid',
        employeeId: 'emp-test-1',
        startDate: '2024-03-01',
        endDate: '2024-03-10',
        daysCount: 10,
        leaveType: 'CONGE_PAYE',
        isPaid: true,
        createdAt: '2024-03-01T00:00:00.000Z',
      }
    ];

    const stats = calculateEmployeeStats(baseEmployee, leaves, targetDate);

    expect(stats.unpaidLeaveDays).toBe(5);
    expect(stats.congePayeDays).toBe(10);
    expect(stats.totalLeaveTakenDays).toBe(10);
  });
});
