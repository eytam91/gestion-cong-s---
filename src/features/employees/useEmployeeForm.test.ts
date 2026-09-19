import { describe, expect, it } from 'vitest';
import {
  emptyValues,
  fieldValidity,
  isFormDirty,
  validateEmployeeForm,
  valuesOf,
  type EmployeeFormValues,
} from './useEmployeeForm';
import { Employee } from '@/types';

const employee = (overrides: Partial<Employee> = {}): Employee => ({
  id: 'emp-1',
  idNumber: 'MAT-0001',
  name: 'Karim Alami',
  position: 'Ingénieur',
  status: 'LOCAL',
  hireDate: '2024-01-01',
  contractType: 'TYPE_A',
  createdAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

const validValues = (overrides: Partial<EmployeeFormValues> = {}): EmployeeFormValues => ({
  ...valuesOf(employee({ id: 'other' })),
  idNumber: 'MAT-9999',
  ...overrides,
});

describe('validateEmployeeForm', () => {
  it('accepts a complete, unique entry', () => {
    expect(validateEmployeeForm(validValues(), [employee()])).toEqual({});
  });

  it('requires name, matricule, position and hire date', () => {
    const errors = validateEmployeeForm(
      validValues({ name: '  ', idNumber: '', position: '', hireDate: '' }),
      [],
    );
    expect(Object.keys(errors).sort()).toEqual(['hireDate', 'idNumber', 'name', 'position']);
  });

  it('rejects a matricule already used by another employee, ignoring case', () => {
    const errors = validateEmployeeForm(validValues({ idNumber: 'mat-0001' }), [employee()]);
    expect(errors.idNumber).toContain('déjà attribué');
  });

  it('lets an employee keep their own matricule while being edited', () => {
    const existing = employee();
    const errors = validateEmployeeForm(
      validValues({ idNumber: existing.idNumber }),
      [existing],
      existing.id,
    );
    expect(errors.idNumber).toBeUndefined();
  });

  it('rejects a hire date outside the supported range', () => {
    expect(validateEmployeeForm(validValues({ hireDate: '1850-01-01' }), []).hireDate).toBeTruthy();
    expect(
      validateEmployeeForm(validValues({ hireDate: 'pas-une-date' }), []).hireDate,
    ).toBeTruthy();
  });

  it('rejects names and positions that are too short', () => {
    const errors = validateEmployeeForm(validValues({ name: 'A', position: 'B' }), []);
    expect(errors.name).toContain('2 caractères');
    expect(errors.position).toContain('2 caractères');
  });
});

describe('fieldValidity', () => {
  it('counts the four required fields', () => {
    expect(fieldValidity(validValues()).validCount).toBe(4);
    expect(fieldValidity(validValues({ name: '' })).validCount).toBe(3);
    expect(fieldValidity(validValues({ name: '', position: '', idNumber: '' })).validCount).toBe(1);
  });
});

describe('isFormDirty', () => {
  it('is clean when an edited employee is untouched', () => {
    const existing = employee();
    expect(isFormDirty(valuesOf(existing), existing)).toBe(false);
  });

  it('is dirty once an edited field differs', () => {
    const existing = employee();
    expect(isFormDirty({ ...valuesOf(existing), position: 'Directeur' }, existing)).toBe(true);
  });

  it('ignores the prefilled matricule when creating, so closing an untouched form does not prompt', () => {
    expect(isFormDirty(emptyValues(1), null)).toBe(false);
  });

  it('is dirty once a new employee has a name', () => {
    expect(isFormDirty({ ...emptyValues(1), name: 'Nouveau' }, null)).toBe(true);
  });
});
