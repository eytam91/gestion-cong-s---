export type ContractType = 'TYPE_A' | 'TYPE_B';
export type EmployeeStatus = 'LOCAL' | 'EXPAT';

export type LeaveType =
  | 'CONGE_PAYE'
  | 'RECUPERATION_JOURS'
  | 'MALADIE_JUSTIFIEE'
  | 'PATERNITE'
  | 'MARIAGE'
  | 'DECES'
  | 'AUTRE';

export type LedgerEntryType = 'ACCRUAL' | 'LEAVE_TAKEN' | 'RECUPERATION';

export interface Employee {
  id: string;
  idNumber: string; // N° Matricule / ID Employé unique (ex: MAT-001)
  name: string;
  position: string; // Intitulé du poste / fonction (ex: Ingénieur Projet, Superviseur Site)
  status: EmployeeStatus; // 'LOCAL' (Personnel Local) ou 'EXPAT' (Expatrié)
  hireDate: string; // Date d'embauche ISO YYYY-MM-DD
  contractType: ContractType; // TYPE_A (30j / 6 mois) ou TYPE_B (30j / 12 mois)
  createdAt: string;
}

export interface LeaveRecord {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  leaveType: LeaveType;
  isPaid?: boolean; // Vrai si congé payé (déduit du solde), faux si non payé / sans solde
  notes?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  action: 'EMPLOYEE_CREATED' | 'EMPLOYEE_UPDATED' | 'EMPLOYEE_DELETED' | 'EMPLOYEES_IMPORTED' | 'LEAVE_ADDED' | 'LEAVE_DELETED' | 'DATA_RESET' | 'DATA_CLEARED' | 'DEVICE_CONNECTED';
  actionLabel: string;
  details: string;
  targetId?: string;
  deviceId: string;
  deviceType: string;
}

export interface DeviceSession {
  deviceId: string;
  firstConnectedAt: string;
  lastActiveAt: string;
  userAgent: string;
  platform: string;
  screenResolution: string;
  deviceType: 'Desktop' | 'Mobile' | 'Tablet';
  language: string;
}

export interface EmployeeStats {

  daysSinceHire: number;
  dailyAccrualRate: number; // Taux d'acquisition quotidien (0.1644 Type A ou 0.0822 Type B)
  totalAccruedDays: number; // Jours acquis par le travail
  totalLeaveTakenDays: number; // Jours de congés payés consommés
  balanceDays: number; // Solde de congés actuel en jours (positif ou solde négatif)
  isDebt: boolean; // Vrai si solde négatif de congés
  debtDays: number; // Montant du solde négatif en jours que l'employé doit
  isExceededAllocatedDays: boolean; // Vrai si l'employé a dépassé ses jours acquis
  exceededDays: number; // Nombre de jours pris au-delà des jours acquis
  daysToPayback: number; // Nombre de jours de travail nécessaires pour résorber/régulariser le solde négatif
  
  // Catégories de congés spécifiques (en jours)
  congePayeDays: number;
  unpaidLeaveDays: number; // Total jours de congés non payés (sans solde)
  recuperationDays: number;
  maladieDays: number;
  paterniteDays: number;
  mariageDays: number;
  decesDays: number;
  autreDays: number;
}
