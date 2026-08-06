import { Employee, LeaveRecord, EmployeeStats, LeaveType } from '../types';

// Taux d'acquisition quotidien de congés en jours
export class DailyAccrualRates {
  static readonly TYPE_A = 30 / 182.5; // ~0.16438356 j/j (30 jours tous les 6 mois)
  static readonly TYPE_B = 30 / 365;   // ~0.08219178 j/j (30 jours par an)
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
  RECUPERATION_JOURS: { bg: 'bg-emerald-50', text: 'text-emerald-950', border: 'border-emerald-300' },
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
  currentDateStr: string = new Date().toISOString().split('T')[0]
): EmployeeStats {
  const hireDate = new Date(employee.hireDate);
  const now = new Date(currentDateStr);
  
  // Calcul du nombre de jours écoulés depuis l'embauche
  const diffTime = Math.max(0, now.getTime() - hireDate.getTime());
  const daysSinceHire = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const dailyAccrualRate =
    employee.contractType === 'TYPE_A'
      ? DailyAccrualRates.TYPE_A
      : DailyAccrualRates.TYPE_B;

  // Total des jours accumulés théoriques par le travail
  const rawAccrued = daysSinceHire * dailyAccrualRate;
  const totalAccruedDays = Math.max(0, rawAccrued);

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

  // Solde de congés payés = (acquis par activité + jours de récupération) - (congés payés pris)
  const balanceDays = (totalAccruedDays + recuperationDays) - congePayeDays;

  const isDebt = balanceDays < 0;
  const debtDays = isDebt ? Math.abs(balanceDays) : 0;
  const isExceededAllocatedDays = isDebt;
  const exceededDays = debtDays;

  // Estimation du nombre de jours de travail nécessaires pour résorber/régulariser le solde négatif
  const daysToPayback = isDebt && dailyAccrualRate > 0 ? Math.ceil(debtDays / dailyAccrualRate) : 0;

  return {
    daysSinceHire,
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

// Sample demo datasets available on demand via Audit & Maintenance
export const SAMPLE_DEMO_EMPLOYEES: Employee[] = [
  {
    id: 'emp-x',
    idNumber: 'MAT-0001',
    name: 'Employé X (Alexandre)',
    position: 'Superviseur de Site',
    status: 'EXPAT',
    hireDate: '2024-06-01',
    contractType: 'TYPE_B', // 30 jours par an (Embauché le 01/06/2024)
    createdAt: new Date('2024-06-01').toISOString(),
  },
  {
    id: 'emp-101',
    idNumber: 'MAT-0012',
    name: 'Karim Alami',
    position: 'Ingénieur Projet Senior',
    status: 'LOCAL',
    hireDate: '2024-01-15',
    contractType: 'TYPE_A', // 30 jours tous les 6 mois (182.5 jours de travail)
    createdAt: new Date('2024-01-15').toISOString(),
  },
  {
    id: 'emp-102',
    idNumber: 'MAT-0015',
    name: 'Sophie Laurent',
    position: 'Responsable Ressources Humaines',
    status: 'LOCAL',
    hireDate: '2024-06-01',
    contractType: 'TYPE_A',
    createdAt: new Date('2024-06-01').toISOString(),
  },
  {
    id: 'emp-103',
    idNumber: 'MAT-0020',
    name: 'Jean-Pierre Dubois',
    position: 'Directeur des Opérations',
    status: 'EXPAT',
    hireDate: '2025-02-10',
    contractType: 'TYPE_B', // 30 jours par an (365 jours de travail)
    createdAt: new Date('2025-02-10').toISOString(),
  },
];

export const SAMPLE_DEMO_LEAVE_RECORDS: LeaveRecord[] = [
  {
    id: 'rec-x1',
    employeeId: 'emp-x',
    startDate: '2024-08-05',
    endDate: '2024-08-20',
    daysCount: 15,
    leaveType: 'CONGE_PAYE',
    isPaid: true,
    notes: 'Premier congé payé d\'été 2024 (15j pris)',
    createdAt: new Date('2024-08-01').toISOString(),
  },
  {
    id: 'rec-x2',
    employeeId: 'emp-x',
    startDate: '2024-11-10',
    endDate: '2024-11-10',
    daysCount: 5,
    leaveType: 'RECUPERATION_JOURS',
    isPaid: true,
    notes: 'Crédit de 5 jours de récupération (heures supp.)',
    createdAt: new Date('2024-11-10').toISOString(),
  },
  {
    id: 'rec-x3',
    employeeId: 'emp-x',
    startDate: '2025-02-17',
    endDate: '2025-02-19',
    daysCount: 3,
    leaveType: 'MALADIE_JUSTIFIEE',
    isPaid: true,
    notes: 'Arrêt maladie justifié de 3 jours',
    createdAt: new Date('2025-02-17').toISOString(),
  },
  {
    id: 'rec-x4',
    employeeId: 'emp-x',
    startDate: '2025-07-01',
    endDate: '2025-07-10',
    daysCount: 10,
    leaveType: 'AUTRE',
    isPaid: false,
    notes: 'Congé sans solde (non payé)',
    createdAt: new Date('2025-06-25').toISOString(),
  },
  {
    id: 'rec-x5',
    employeeId: 'emp-x',
    startDate: '2026-06-01',
    endDate: '2026-07-25',
    daysCount: 55,
    leaveType: 'CONGE_PAYE',
    isPaid: true,
    notes: 'Grand congé annuel 2026 (55j pris)',
    createdAt: new Date('2026-05-20').toISOString(),
  },
];
