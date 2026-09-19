import { describe, expect, it } from 'vitest';
import { DailyAccrualRates, calculateEmployeeStats } from '@/features/leave/vacationCalc';
import { Employee, LeaveRecord } from '@/types';

const employee = (overrides: Partial<Employee> = {}): Employee => ({
  id: 'emp-1',
  idNumber: 'MAT-0001',
  name: 'Test Employé',
  position: 'Ingénieur',
  status: 'LOCAL',
  hireDate: '2024-01-01',
  contractType: 'TYPE_A',
  createdAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

const leave = (overrides: Partial<LeaveRecord> = {}): LeaveRecord => ({
  id: 'rec-1',
  employeeId: 'emp-1',
  startDate: '2024-03-01',
  endDate: '2024-03-10',
  daysCount: 10,
  leaveType: 'CONGE_PAYE',
  createdAt: '2024-03-01T00:00:00.000Z',
  ...overrides,
});

describe('calculateEmployeeStats', () => {
  it('accrues at the Type A rate of 30 days per 6 months', () => {
    const stats = calculateEmployeeStats(employee(), [], '2024-07-01');

    expect(stats.daysSinceHire).toBe(182);
    expect(stats.totalAccruedDays).toBeCloseTo(182 * DailyAccrualRates.TYPE_A, 5);
    expect(stats.totalAccruedDays).toBeCloseTo(29.92, 2);
  });

  it('accrues at half the rate on a Type B contract', () => {
    const typeA = calculateEmployeeStats(employee(), [], '2024-07-01');
    const typeB = calculateEmployeeStats(employee({ contractType: 'TYPE_B' }), [], '2024-07-01');

    expect(typeB.totalAccruedDays).toBeCloseTo(typeA.totalAccruedDays / 2, 5);
  });

  it('deducts paid leave from the balance', () => {
    const stats = calculateEmployeeStats(employee(), [leave({ daysCount: 10 })], '2024-07-01');

    expect(stats.congePayeDays).toBe(10);
    expect(stats.balanceDays).toBeCloseTo(stats.totalAccruedDays - 10, 5);
    expect(stats.isDebt).toBe(false);
  });

  it('credits recuperation days back to the balance', () => {
    const withRecup = calculateEmployeeStats(
      employee(),
      [leave({ id: 'r2', leaveType: 'RECUPERATION_JOURS', daysCount: 5 })],
      '2024-07-01',
    );
    const baseline = calculateEmployeeStats(employee(), [], '2024-07-01');

    expect(withRecup.recuperationDays).toBe(5);
    expect(withRecup.balanceDays).toBeCloseTo(baseline.balanceDays + 5, 5);
  });

  it('reports a debt and a payback estimate when leave exceeds accrual', () => {
    const stats = calculateEmployeeStats(employee(), [leave({ daysCount: 40 })], '2024-07-01');

    expect(stats.isDebt).toBe(true);
    expect(stats.debtDays).toBeCloseTo(40 - stats.totalAccruedDays, 5);
    expect(stats.daysToPayback).toBe(Math.ceil(stats.debtDays / DailyAccrualRates.TYPE_A));
    // Working daysToPayback more days must clear the debt.
    expect(stats.daysToPayback * DailyAccrualRates.TYPE_A).toBeGreaterThanOrEqual(stats.debtDays);
  });

  it('excludes unpaid leave from the paid-leave balance', () => {
    const stats = calculateEmployeeStats(
      employee(),
      [leave({ daysCount: 10, isPaid: false })],
      '2024-07-01',
    );

    expect(stats.unpaidLeaveDays).toBe(10);
    expect(stats.congePayeDays).toBe(0);
    expect(stats.balanceDays).toBeCloseTo(stats.totalAccruedDays, 5);
  });

  it('does not count sick or family leave against the paid-leave balance', () => {
    const stats = calculateEmployeeStats(
      employee(),
      [
        leave({ id: 'r1', leaveType: 'MALADIE_JUSTIFIEE', daysCount: 4 }),
        leave({ id: 'r2', leaveType: 'PATERNITE', daysCount: 3 }),
        leave({ id: 'r3', leaveType: 'DECES', daysCount: 2 }),
      ],
      '2024-07-01',
    );

    expect(stats.maladieDays).toBe(4);
    expect(stats.paterniteDays).toBe(3);
    expect(stats.decesDays).toBe(2);
    expect(stats.balanceDays).toBeCloseTo(stats.totalAccruedDays, 5);
  });

  it('ignores leave belonging to other employees', () => {
    const stats = calculateEmployeeStats(
      employee(),
      [leave({ employeeId: 'emp-999', daysCount: 25 })],
      '2024-07-01',
    );

    expect(stats.congePayeDays).toBe(0);
  });

  it('never accrues negative days for a future hire date', () => {
    const stats = calculateEmployeeStats(employee({ hireDate: '2030-01-01' }), [], '2024-07-01');

    expect(stats.daysSinceHire).toBe(0);
    expect(stats.totalAccruedDays).toBe(0);
  });
});
