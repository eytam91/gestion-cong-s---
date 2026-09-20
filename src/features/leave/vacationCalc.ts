import { Employee, LeaveRecord, EmployeeStats, LeaveType } from '@/types';

// Taux d'acquisition quotidien de congés en jours :
// - TYPE_A (Cycle 6 mois / 182.5 jours) : 5 mois de travail (152.5 jours) pour acquérir les 30 jours de congés du 6e mois.
// - TYPE_B (Cycle annuel 12 mois / 365 jours) : 11 mois de travail (335 jours) pour acquérir les 30 jours de congés du 12e mois.
export class DailyAccrualRates {
  static readonly TYPE_A = 30 / (182.5 - 30); // 30 / 152.5 ≈ 0.19672131 j/j (30 jours acquis après 5 mois de travail)
  static readonly TYPE_B = 30 / (365 - 30); // 30 / 335 ≈ 0.08955224 j/j (30 jours acquis après 11 mois de travail)
}

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  CONGE_PAYE: 'Congé Payé Standard',
  RECUPERATION_JOURS: 'Récupération de jours',
  MALADIE_JUSTIFIEE: 'Congé Maladie Justifié',
  PATERNITE: 'Congé Paternité',
  MARIAGE: 'Congé Evénement Familial (Mariage)',
  DECES: 'Congé Evénement Familial (Décès)',
  AUTRE: 'Autre Congé Autorisée',
};

export const LEAVE_TYPE_COLORS: Record<LeaveType, { bg: string; text: string; border: string }> = {
  CONGE_PAYE: { bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200' },
  RECUPERATION_JOURS: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-950',
    border: 'border-emerald-300',
  },
  MALADIE_JUSTIFIEE: { bg: 'bg-red-50', text: 'text-red-900', border: 'border-red-200' },
  PATERNITE: { bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-200' },
  MARIAGE: { bg: 'bg-purple-50', text: 'text-purple-900', border: 'border-purple-200' },
  DECES: { bg: 'bg-stone-100', text: 'text-stone-800', border: 'border-stone-300' },
  AUTRE: { bg: 'bg-teal-50', text: 'text-teal-900', border: 'border-teal-200' },
};

/**
 * Calcule toutes les métriques du solde de congés, solde négatif et régularisation d'un employé.
 */
export function calculateEmployeeStats(
  employee: Employee,
  leaveRecords: LeaveRecord[],
  currentDateStr: string = new Date().toISOString().split('T')[0],
): EmployeeStats {
  const hireDate = new Date(employee.hireDate);
  const now = new Date(currentDateStr);

  // Calcul du nombre de jours écoulés depuis l'embauche
  const diffTime = Math.max(0, now.getTime() - hireDate.getTime());
  const daysSinceHire = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const dailyAccrualRate =
    employee.contractType === 'TYPE_A' ? DailyAccrualRates.TYPE_A : DailyAccrualRates.TYPE_B;

  // Filtrer les enregistrements de cet employé
  const empRecords = leaveRecords.filter((r) => r.employeeId === employee.id);

  let congePayeDays = 0;
  let unpaidLeaveDays = 0;
  let recuperationDays = 0;
  let maladieDays = 0;
  let paterniteDays = 0;
  let mariageDays = 0;
  let decesDays = 0;
  let autreDays = 0;

  empRecords.forEach((r) => {
    // Si la demande est non payée (sans solde)
    if (r.isPaid === false) {
      unpaidLeaveDays += r.daysCount;
      return;
    }

    switch (r.leaveType) {
      case 'CONGE_PAYE':
        congePayeDays += r.daysCount;
        break;
      case 'RECUPERATION_JOURS':
        recuperationDays += r.daysCount;
        break;
      case 'MALADIE_JUSTIFIEE':
        maladieDays += r.daysCount;
        break;
      case 'PATERNITE':
        paterniteDays += r.daysCount;
        break;
      case 'MARIAGE':
        mariageDays += r.daysCount;
        break;
      case 'DECES':
        decesDays += r.daysCount;
        break;
      case 'AUTRE':
        autreDays += r.daysCount;
        break;
    }
  });

  // Jours effectivement travaillés ouvrant droit à l'acquisition de congés.
  // Pendant les congés payés (le 6e mois pour Type A ou le 12e mois pour Type B)
  // et les congés sans solde, l'employé est en vacances/absence et ne travaille pas.
  const daysWorked = Math.max(0, daysSinceHire - congePayeDays - unpaidLeaveDays);

  // Total des jours de congés acquis par le travail effectif
  const rawAccrued = daysWorked * dailyAccrualRate;
  const totalAccruedDays = Math.max(0, rawAccrued);

  // Solde de congés payés = (acquis par activité + jours de récupération) - (congés payés pris)
  const balanceDays = totalAccruedDays + recuperationDays - congePayeDays;

  const isDebt = balanceDays < 0;
  const debtDays = isDebt ? Math.abs(balanceDays) : 0;
  const isExceededAllocatedDays = isDebt;
  const exceededDays = debtDays;

  // Estimation du nombre de jours de travail nécessaires pour résorber/régulariser le solde négatif
  const daysToPayback = isDebt && dailyAccrualRate > 0 ? Math.ceil(debtDays / dailyAccrualRate) : 0;

  return {
    daysSinceHire,
    daysWorked,
    dailyAccrualRate,
    totalAccruedDays,
    totalLeaveTakenDays: congePayeDays,
    balanceDays,
    isDebt,
    debtDays,
    isExceededAllocatedDays,
    exceededDays,
    daysToPayback,

    congePayeDays,
    unpaidLeaveDays,
    recuperationDays,
    maladieDays,
    paterniteDays,
    mariageDays,
    decesDays,
    autreDays,
  };
}

// Default initial arrays are empty for real production environment
export const INITIAL_EMPLOYEES: Employee[] = [];
export const INITIAL_LEAVE_RECORDS: LeaveRecord[] = [];

// Sample demo datasets are empty to ensure a clean, brand new database
export const SAMPLE_DEMO_EMPLOYEES: Employee[] = [];
export const SAMPLE_DEMO_LEAVE_RECORDS: LeaveRecord[] = [];
