import * as XLSX from 'xlsx';
import { Employee, EmployeeStatus, ContractType, LeaveRecord } from '@/types';
import { calculateEmployeeStats } from '@/features/leave/vacationCalc';

export interface ParsedEmployeeRow {
  index: number;
  raw: Record<string, unknown>;
  idNumber: string;
  matriculeGL: string;
  nationality: string;
  name: string;
  position: string;
  status: EmployeeStatus;
  hireDate: string;
  contractType: ContractType;
  isValid: boolean;
  validationErrors: string[];
  isDuplicateId?: boolean;
}

export interface ParseResult {
  sheetNames: string[];
  selectedSheet: string;
  rows: ParsedEmployeeRow[];
  totalRows: number;
  validCount: number;
  errorCount: number;
  localCount: number;
  expatCount: number;
  typeACount: number;
  typeBCount: number;
}

/**
 * Normalizes any date value (Excel serial number, Date object, string) into
 * YYYY-MM-DD, or returns null when the value cannot be understood.
 *
 * Returning null rather than a default matters: the hire date drives every leave
 * accrual figure, so silently substituting today's date would quietly corrupt an
 * employee's balance instead of surfacing a typo at import time.
 */
export function normalizeExcelDate(val: unknown): string | null {
  if (val === null || val === undefined || val === '') {
    return null;
  }

  // If already a Date object (from XLSX cellDates: true)
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split('T')[0];
  }

  // If numeric (Excel serial date number, e.g. 45444)
  if (typeof val === 'number') {
    try {
      const parsedDate = XLSX.SSF.parse_date_code(val);
      if (parsedDate && parsedDate.y && parsedDate.m && parsedDate.d) {
        const y = String(parsedDate.y);
        const m = String(parsedDate.m).padStart(2, '0');
        const d = String(parsedDate.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } catch {
      // Fallback calculation for Excel serial date
      const date = new Date((val - (25567 + 2)) * 86400 * 1000);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
  }

  const str = String(val).trim();

  // If YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return isRealCalendarDate(str) ? str : null;
  }

  // If DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmyMatch) {
    const iso = `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
    return isRealCalendarDate(iso) ? iso : null;
  }

  // If YYYY/MM/DD or YYYY.MM.DD
  const ymdMatch = str.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (ymdMatch) {
    const iso = `${ymdMatch[1]}-${ymdMatch[2].padStart(2, '0')}-${ymdMatch[3].padStart(2, '0')}`;
    return isRealCalendarDate(iso) ? iso : null;
  }

  // Try standard Date parsing
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    if (y >= 1970 && y <= 2099) {
      return parsed.toISOString().split('T')[0];
    }
  }

  return null;
}

/**
 * Normalizes employee status (LOCAL or EXPAT) with smart alias matching.
 */
export function normalizeExcelStatus(val: unknown): EmployeeStatus {
  if (!val) return 'LOCAL';
  const str = String(val).trim().toUpperCase();

  if (
    str.includes('EXPAT') ||
    str.includes('ÉTRANGER') ||
    str.includes('ETRANGER') ||
    str.includes('NON LOCAL') ||
    str === 'EXP'
  ) {
    return 'EXPAT';
  }

  return 'LOCAL';
}

/**
 * Normalizes contract type (TYPE_A: 30j/6m or TYPE_B: 30j/12m).
 */
export function normalizeExcelContract(val: unknown): ContractType {
  if (!val) return 'TYPE_A';

  // Remove all non-alphanumeric characters (spaces, dashes, underscores) to match reliably
  const str = String(val)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  if (
    str.includes('TYPEB') ||
    str.includes('ANNUEL') ||
    str.includes('12MOIS') ||
    str.includes('12M') ||
    str.includes('1AN') ||
    str.includes('365') ||
    str === 'B'
  ) {
    return 'TYPE_B';
  }

  return 'TYPE_A';
}

/**
 * Confirms a YYYY-MM-DD string is a real calendar date. Regex alone accepts
 * impossible values like 32/13/2024, which would otherwise be stored verbatim.
 */
function isRealCalendarDate(iso: string): boolean {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) return false;
  if (y < 1970 || y > 2099) return false;
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
}

/**
 * Normalizes a header for fuzzy lookup (removes accents, punctuation, spacing).
 */
function cleanKey(k: string): string {
  return String(k || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Parses an Excel (.xlsx, .xls, .ods) or CSV/TSV file and returns structured employee rows.
 */
export async function parseExcelOrCsvFile(
  file: File,
  targetSheetName?: string,
  existingEmployees: Employee[] = [],
): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();

  // Read workbook with SheetJS
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: true,
    raw: false,
    dateNF: 'yyyy-mm-dd',
  });

  const sheetNames = workbook.SheetNames;
  if (sheetNames.length === 0) {
    throw new Error('Le classeur Excel ne contient aucune feuille de calcul.');
  }

  const selectedSheet =
    targetSheetName && sheetNames.includes(targetSheetName) ? targetSheetName : sheetNames[0];

  const worksheet = workbook.Sheets[selectedSheet];
  if (!worksheet) {
    throw new Error(`Feuille de calcul "${selectedSheet}" introuvable.`);
  }

  // Convert to JSON objects with raw headers
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
    blankrows: false,
  });

  if (rawRows.length === 0) {
    return {
      sheetNames,
      selectedSheet,
      rows: [],
      totalRows: 0,
      validCount: 0,
      errorCount: 0,
      localCount: 0,
      expatCount: 0,
      typeACount: 0,
      typeBCount: 0,
    };
  }

  const existingMatricules = new Set(
    existingEmployees.map((e) => (e.idNumber || '').trim().toLowerCase()).filter(Boolean),
  );

  const parsedRows: ParsedEmployeeRow[] = [];

  rawRows.forEach((row, idx) => {
    const keys = Object.keys(row);

    const getVal = (patterns: string[]): unknown => {
      // 1. Try exact matches first, in order of preferred patterns
      for (const p of patterns) {
        const cp = cleanKey(p);
        for (const key of keys) {
          const ck = cleanKey(key);
          if (ck === cp) {
            const val = row[key];
            if (val !== undefined && val !== null && String(val).trim() !== '') {
              return val;
            }
          }
        }
      }

      // 2. Try substring matches, in order of preferred patterns
      for (const p of patterns) {
        const cp = cleanKey(p);
        for (const key of keys) {
          const ck = cleanKey(key);
          if (ck.includes(cp)) {
            const val = row[key];
            if (val !== undefined && val !== null && String(val).trim() !== '') {
              return val;
            }
          }
        }
      }

      return '';
    };

    // 1. Matricule RH
    const rawId = getVal([
      'matriculerh',
      'matricule',
      'idnumber',
      'id',
      'mat',
      'numero',
      'n',
      'ref',
      'badge',
      'empid',
    ]);
    const idNumber = String(rawId || '').trim() || `MAT-${String(idx + 1).padStart(4, '0')}`;

    // 1b. Matricule GL (ID Société / Entreprise)
    const rawMatriculeGL = getVal([
      'matriculegl',
      'matgl',
      'idgl',
      'gl',
      'matriculesociete',
      'idsociete',
      'codesociete',
      'companyid',
      'idcompany',
      'matriculeentreprise',
      'identreprise',
      'compagnie',
      'codeentreprise',
      'societeid',
    ]);
    const matriculeGL = String(rawMatriculeGL || '').trim();

    // 1c. Nationalité
    const rawNationality = getVal([
      'nationalite',
      'nationality',
      'pays',
      'paysorigine',
      'citoyennete',
      'origine',
      'national',
    ]);
    const nationality = String(rawNationality || '').trim();

    // 2. Nom & Prénom
    let fullName = String(
      getVal([
        'nomprenom',
        'nometprenom',
        'nomcomplet',
        'fullname',
        'collaborateur',
        'employe',
        'agent',
        'personnel',
      ]) || '',
    ).trim();

    if (!fullName) {
      const separateNom = String(getVal(['nomfamille', 'nom', 'name', 'lastname']) || '').trim();
      const separatePrenom = String(getVal(['prenom', 'firstname', 'givenname']) || '').trim();

      if (separateNom && separatePrenom && separateNom !== separatePrenom) {
        fullName = `${separatePrenom} ${separateNom}`;
      } else {
        fullName = separateNom || separatePrenom;
      }
    }

    // 3. Poste / Fonction
    const rawPosition = getVal([
      'poste',
      'fonction',
      'position',
      'metier',
      'titre',
      'intitule',
      'role',
      'job',
      'jobtitle',
      'service',
      'departement',
    ]);
    const position = String(rawPosition || '').trim() || 'Collaborateur RH';

    // 4. Statut (LOCAL ou EXPAT)
    const rawStatus = getVal([
      'statut',
      'status',
      'typepersonnel',
      'localexpat',
      'expat',
      'categorie',
    ]);
    const status = normalizeExcelStatus(
      rawStatus ||
        (nationality &&
        !nationality.toLowerCase().includes('locale') &&
        !nationality.toLowerCase().includes('nationale')
          ? nationality
          : ''),
    );

    // 5. Date d'embauche
    const rawHireDate = getVal([
      'dateembauche',
      'datedembauche',
      'datedentree',
      'embauche',
      'hiredate',
      'hire_date',
      'startdate',
      'recrutement',
      'date',
    ]);
    const parsedHireDate = normalizeExcelDate(rawHireDate);

    // 6. Type de contrat
    const rawContract = getVal([
      'typecontrat',
      'typedecontrat',
      'contracttype',
      'cycle',
      'regime',
      'formule',
      'duree',
      'contrat',
      'contract',
      'type',
    ]);
    const contractType = normalizeExcelContract(rawContract);

    // Validation
    const validationErrors: string[] = [];
    if (!fullName) {
      validationErrors.push('Nom et prénom manquants');
    } else if (fullName.length < 2) {
      validationErrors.push('Nom trop court (min. 2 caractères)');
    }

    if (!idNumber) {
      validationErrors.push('N° Matricule RH manquant');
    }

    if (!parsedHireDate) {
      validationErrors.push(
        rawHireDate
          ? `Date d'embauche illisible : "${String(rawHireDate)}" (format attendu AAAA-MM-JJ ou JJ/MM/AAAA)`
          : "Date d'embauche manquante",
      );
    } else if (parsedHireDate > new Date().toISOString().split('T')[0]) {
      validationErrors.push(`Date d'embauche dans le futur : ${parsedHireDate}`);
    }

    const isDuplicate = existingMatricules.has(idNumber.toLowerCase());

    parsedRows.push({
      index: idx + 1,
      raw: row,
      idNumber,
      matriculeGL,
      nationality,
      name: fullName,
      position,
      status,
      hireDate: parsedHireDate ?? '',
      contractType,
      isValid: validationErrors.length === 0,
      validationErrors,
      isDuplicateId: isDuplicate,
    });
  });

  const validRows = parsedRows.filter((r) => r.isValid);
  const errorCount = parsedRows.filter((r) => !r.isValid).length;
  const localCount = validRows.filter((r) => r.status === 'LOCAL').length;
  const expatCount = validRows.filter((r) => r.status === 'EXPAT').length;
  const typeACount = validRows.filter((r) => r.contractType === 'TYPE_A').length;
  const typeBCount = validRows.filter((r) => r.contractType === 'TYPE_B').length;

  return {
    sheetNames,
    selectedSheet,
    rows: parsedRows,
    totalRows: parsedRows.length,
    validCount: validRows.length,
    errorCount,
    localCount,
    expatCount,
    typeACount,
    typeBCount,
  };
}

/**
 * Generates and downloads a clean Excel (.xlsx) template with sample employees and proper columns including Matricule GL and Nationalité.
 */
export function downloadEmployeeExcelTemplate() {
  const wb = XLSX.utils.book_new();

  const headers = [
    'N° Matricule RH',
    'Matricule GL (ID Société)',
    'Nom & Prénom',
    'Nationalité',
    'Poste / Fonction',
    'Statut (LOCAL ou EXPAT)',
    "Date d'Embauche (AAAA-MM-JJ)",
    'Type de Contrat (TYPE_A ou TYPE_B)',
  ];

  const sampleData = [
    [
      'MAT-0012',
      'GL-1042',
      'Karim Alami',
      'Sénégalaise',
      'Ingénieur Projet Senior',
      'LOCAL',
      '2024-01-15',
      'TYPE_A',
    ],
    [
      'MAT-0015',
      'GL-1045',
      'Sophie Laurent',
      'Française',
      'Responsable Ressources Humaines',
      'LOCAL',
      '2024-06-01',
      'TYPE_A',
    ],
    [
      'MAT-0020',
      'GL-1050',
      'Jean-Pierre Dubois',
      'Française',
      'Directeur des Opérations',
      'EXPAT',
      '2025-02-10',
      'TYPE_B',
    ],
    [
      'MAT-0025',
      'GL-1055',
      'Marc Lemoine',
      'Belge',
      'Superviseur Sécurité Site',
      'EXPAT',
      '2024-09-01',
      'TYPE_A',
    ],
    [
      'MAT-0030',
      'GL-1060',
      'Fatima Zahra',
      'Marocaine',
      'Comptable Générale',
      'LOCAL',
      '2023-11-20',
      'TYPE_B',
    ],
    [
      'MAT-0035',
      'GL-1065',
      'Alexandre Petit',
      'Française',
      'Chef de Chantier',
      'EXPAT',
      '2024-04-10',
      'TYPE_A',
    ],
    [
      'MAT-0040',
      'GL-1070',
      'Mamadou Diallo',
      'Guinéenne',
      'Technicien Électromécanicien',
      'LOCAL',
      '2024-07-01',
      'TYPE_A',
    ],
    [
      'MAT-0045',
      'GL-1075',
      'Chen Wei',
      'Chinoise',
      'Expert Génie Civil',
      'EXPAT',
      '2024-03-15',
      'TYPE_B',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);

  // Set column widths
  ws['!cols'] = [
    { wch: 18 }, // Matricule RH
    { wch: 24 }, // Matricule GL (ID Société)
    { wch: 28 }, // Nom & Prénom
    { wch: 20 }, // Nationalité
    { wch: 32 }, // Poste
    { wch: 24 }, // Statut
    { wch: 28 }, // Date embauche
    { wch: 32 }, // Contrat
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Effectif Employes');

  // Write file and trigger download
  XLSX.writeFile(wb, `modele_import_employes_rh_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * Exports full employee list with real-time leave stats to an Excel workbook (.xlsx).
 */
export function exportEmployeesToExcel(employees: Employee[], leaveRecords: LeaveRecord[]) {
  if (employees.length === 0) {
    throw new Error('Aucun employé à exporter.');
  }

  const wb = XLSX.utils.book_new();

  const headers = [
    'N° Matricule RH',
    'Matricule GL (ID Société)',
    'Nom & Prénom',
    'Nationalité',
    'Poste / Fonction',
    'Statut Contractuel',
    'Cycle de Congés',
    "Date d'Embauche",
    'Jours Travaillés',
    'Jours Acquis (Travail)',
    'Congés Payés Pris (j)',
    'Autres Congés (Maladie/Récup)',
    'Solde Actuel (j)',
    'Situation Solde',
    'Dette Congés (j)',
    'Jours Travail pour Régulariser',
  ];

  const rows = employees.map((emp) => {
    const stats = calculateEmployeeStats(emp, leaveRecords);
    const empRecords = leaveRecords.filter((r) => r.employeeId === emp.id);
    const otherLeaves = empRecords
      .filter((r) => r.leaveType !== 'CONGE_PAYE')
      .reduce((sum, r) => sum + r.daysCount, 0);

    return [
      emp.idNumber || '',
      emp.matriculeGL || '',
      emp.name,
      emp.nationality || '',
      emp.position || '',
      emp.status === 'EXPAT' ? 'Expatrié (EXPAT)' : 'Personnel Local (LOCAL)',
      emp.contractType === 'TYPE_A' ? 'Type A (30j / 6 mois)' : 'Type B (30j / 12 mois)',
      emp.hireDate,
      stats.daysSinceHire,
      Number(stats.totalAccruedDays.toFixed(2)),
      Number(stats.totalLeaveTakenDays.toFixed(1)),
      otherLeaves,
      Number(stats.balanceDays.toFixed(2)),
      stats.isDebt ? 'DÉBITEUR (Dépassement)' : 'CRÉDITEUR (Solde positif)',
      stats.isDebt ? Number(stats.debtDays.toFixed(2)) : 0,
      stats.isDebt ? stats.daysToPayback : 0,
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  ws['!cols'] = [
    { wch: 18 }, // Matricule RH
    { wch: 24 }, // Matricule GL (ID Société)
    { wch: 28 }, // Nom & Prénom
    { wch: 20 }, // Nationalité
    { wch: 28 }, // Poste
    { wch: 24 }, // Statut
    { wch: 26 }, // Cycle
    { wch: 16 }, // Date embauche
    { wch: 16 }, // Jours travaillés
    { wch: 22 }, // Jours acquis
    { wch: 20 }, // Congés payés pris
    { wch: 24 }, // Autres congés
    { wch: 16 }, // Solde actuel
    { wch: 24 }, // Situation
    { wch: 16 }, // Dette
    { wch: 28 }, // Jours régul
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Etat des Conges RH');

  XLSX.writeFile(wb, `registre_employes_conges_${new Date().toISOString().split('T')[0]}.xlsx`);
}
