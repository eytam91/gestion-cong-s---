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

export type HRComplianceState =
  | 'EN_REGLE'
  | 'A_REGULARISER'
  | 'A_COMPLETER_VERIFIER'
  | 'A_RENOUVELER'
  | 'A_CONFIRMER'
  | 'PARTI';

export type EmploymentStatusType = 'ACTIF' | 'A_CONFIRMER' | 'CONTRAT_TERMINE';

export type DocumentCategory =
  | 'CONTRAT'
  | 'PIECE_IDENTITE'
  | 'TITRE_SEJOUR'
  | 'PERMIS_TRAVAIL'
  | 'PERMIS_CONDUIRE'
  | 'ATTESTATION_INSESO'
  | 'SANCTION'
  | 'CERTIFICAT_MEDICAL'
  | 'DIPLOME'
  | 'AUTRE';

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  name: string;
  category: DocumentCategory;
  uploadDate: string;
  size: number;
  type: string;
  fileData?: string; // Base64 data URL for preview and download
  notes?: string;
}

export interface Employee {
  id: string;
  idNumber: string; // N° Matricule RH unique (ex: P422766 ou MAT-001)
  matriculeGL?: string; // Matricule GL / ID Société / ID Entreprise
  name: string; // Nom & Prénom complet
  position: string; // Intitulé du poste / fonction
  status: EmployeeStatus; // 'LOCAL' ou 'EXPAT'
  hireDate: string; // Date d'embauche ISO YYYY-MM-DD
  contractType: ContractType; // TYPE_A ou TYPE_B
  createdAt: string;

  // --- Extended HR Dossier & Document Attributes (from JSON) ---
  givenNames?: string;
  surnames?: string;
  otherSpellings?: string;
  sex?: 'M' | 'F';
  birthDate?: string;
  birthYear?: number;
  birthYearSource?: string;
  nationality?: string;
  nationalityCountry?: string;
  isForeign?: boolean;
  maritalStatus?: string;
  childrenCount?: number;
  address?: string;
  phone1?: string;
  phone2?: string;
  educationLevel?: string;

  // Identity documents
  idDocumentType?: string;
  idDocumentNumber?: string;
  idDocument2Type?: string;
  idDocument2Number?: string;
  idDocumentNumberAtInseso?: string;

  // Employment & Contract Details
  employmentStatus?: EmploymentStatusType;
  department?: string;
  site?: 'MALABO' | 'BATA' | 'MONGOMO' | string;
  contractStartDate?: string;
  contractEndDate?: string;
  contractStatus?: 'EN_COURS' | 'TERMINE' | string;
  seniorityYears?: number;
  seniorityMonths?: number;
  baseSalary?: number;
  allowanceFood?: boolean;
  allowanceSpecial?: boolean;
  allowanceHousing?: boolean;

  // Social Security & INSESO
  isInsured?: boolean;
  ssNumber?: string; // N° Sécurité Sociale INSESO
  ssNumberDuplicate?: string;
  insesoSequenceNumber?: number;
  insesoDate?: string;
  hireToInsesoDays?: number;
  insesoDateCheck?: string;
  insuredFlagInPersonnelFile?: string;

  // Legal Permits & Compliance
  workPermitRequired?: boolean;
  workPermitNumber?: string;
  workPermitStart?: string;
  workPermitExpiry?: string;
  workPermitState?: string;

  residenceRequired?: boolean;
  residenceStart?: string;
  residenceExpiry?: string;
  residenceState?: string;

  drivingLicenceRequired?: boolean;
  drivingLicenceNumber?: string;
  drivingLicenceStart?: string;
  drivingLicenceExpiry?: string;
  drivingLicenceState?: string;

  // Leave & Discipline
  annualLeaveDays?: number;
  leaveRequestsCount?: number;
  leaveRequestDates?: string;
  absenceRequestHours?: string;
  absenceRequestReason?: string;

  totalSanctions?: number;
  totalSuspensionDays?: number;
  sanctionDates?: string;
  lastSanctionDate?: string;
  lastSanctionType?: string;
  lastSanctionReason?: string;

  // HR Status & Compliance Overview
  overallState?: HRComplianceState;
  stateReasons?: string;
  openItemsToComplete?: number;
  openItemsToVerify?: number;
  openItemsDetail?: string;
  correctionsApplied?: string;
  inInsesoListAug2026?: boolean;
  inPersonnelFile?: boolean;
  age?: number;

  // Uploaded Employee Documents
  documents?: EmployeeDocument[];

  // Internal HR Notes & Administrative Remarks
  notes?: string;
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
  action: 
    | 'EMPLOYEE_CREATED' 
    | 'EMPLOYEE_UPDATED' 
    | 'EMPLOYEE_DELETED' 
    | 'EMPLOYEES_IMPORTED' 
    | 'LEAVE_ADDED' 
    | 'LEAVE_DELETED' 
    | 'DATA_RESET' 
    | 'DATA_CLEARED' 
    | 'DEVICE_CONNECTED'
    | 'CONFIDENTIAL_MODE_TOGGLED'
    | 'CONFIDENTIAL_DATA_REVEALED'
    | 'CONFIDENTIAL_DATA_EXPORTED'
    | 'USER_LOGIN'
    | 'USER_LOGOUT'
    | 'SECURITY_ALERT'
    | 'ROLE_CHANGED';
  actionLabel: string;
  details: string;
  targetId?: string;
  deviceId: string;
  deviceType: string;
  actorUid?: string;
  actorName?: string;
  actorEmail?: string;
  actorRole?: string;
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
  daysWorked: number; // Jours effectivement travaillés (hors congés pris et sans solde)
  dailyAccrualRate: number; // Taux d'acquisition quotidien (~0.1967 Type A ou ~0.0896 Type B)
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
