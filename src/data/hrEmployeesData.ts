import { Employee, EmployeeDocument } from '../types';
import { RAW_EMPLOYEES_PART_1 } from './rawEmployeesPart1';
import { RAW_EMPLOYEES_PART_2 } from './rawEmployeesPart2';
import { RAW_EMPLOYEES_PART_3 } from './rawEmployeesPart3';

const ALL_RAW = [...RAW_EMPLOYEES_PART_1, ...RAW_EMPLOYEES_PART_2, ...RAW_EMPLOYEES_PART_3];

function createDefaultDocuments(raw: any): EmployeeDocument[] {
  const docs: EmployeeDocument[] = [];
  const empId = raw.employee_id;
  const nowStr = '2026-01-15T09:00:00.000Z';

  // 1. Contrat de Travail
  docs.push({
    id: `doc-${empId}-contract`,
    employeeId: empId,
    name: `Contrat de Travail - ${raw.matricule}.pdf`,
    category: 'CONTRAT',
    uploadDate: nowStr,
    size: 245000,
    type: 'application/pdf',
    notes: `Contrat signé initialement le ${raw.contract_start_date || raw.hire_date || '2024-03-11'}`
  });

  // 2. Pièce d'Identité
  if (raw.id_document_type || raw.id_document_number) {
    docs.push({
      id: `doc-${empId}-id`,
      employeeId: empId,
      name: `${raw.id_document_type || 'Identité'} - ${raw.id_document_number || 'Copie'}.pdf`,
      category: 'PIECE_IDENTITE',
      uploadDate: nowStr,
      size: 184000,
      type: 'application/pdf',
      notes: `Numéro enregistré: ${raw.id_document_number || 'N/A'}`
    });
  }

  // 3. Document de Résidence (si étranger ou requis)
  if (raw.is_foreign || raw.residence_required) {
    docs.push({
      id: `doc-${empId}-residence`,
      employeeId: empId,
      name: `Titre de Séjour - Résidence ${raw.residence_state === 'EXPIRE' ? '(À renouveler)' : 'Valide'}.pdf`,
      category: 'TITRE_SEJOUR',
      uploadDate: nowStr,
      size: 312000,
      type: 'application/pdf',
      notes: raw.residence_expiry ? `Date d'échéance: ${raw.residence_expiry}` : 'Statut: ' + (raw.residence_state || 'En cours')
    });
  }

  // 4. Permis de Travail (si requis)
  if (raw.work_permit_required) {
    docs.push({
      id: `doc-${empId}-permit`,
      employeeId: empId,
      name: `Permis de Travail N°${raw.work_permit_number || 'Ref'}.pdf`,
      category: 'PERMIS_TRAVAIL',
      uploadDate: nowStr,
      size: 290000,
      type: 'application/pdf',
      notes: `Validité: ${raw.work_permit_start || '2024'} au ${raw.work_permit_expiry || '2028'}`
    });
  }

  // 5. Permis de Conduire (si requis)
  if (raw.driving_licence_required) {
    docs.push({
      id: `doc-${empId}-license`,
      employeeId: empId,
      name: `Permis de Conduire N°${raw.driving_licence_number || 'Provisoire'}.pdf`,
      category: 'PERMIS_CONDUIRE',
      uploadDate: nowStr,
      size: 210000,
      type: 'application/pdf',
      notes: raw.driving_licence_expiry ? `Expiration: ${raw.driving_licence_expiry}` : 'Permis professionnel requis pour conduite véhicule'
    });
  }

  // 6. Attestation Sécurité Sociale / INSESO
  if (raw.is_insured || raw.ss_number) {
    docs.push({
      id: `doc-${empId}-inseso`,
      employeeId: empId,
      name: `Attestation Affiliation INSESO - ${raw.ss_number || 'Affilié'}.pdf`,
      category: 'ATTESTATION_INSESO',
      uploadDate: nowStr,
      size: 155000,
      type: 'application/pdf',
      notes: `N° Sécurité Sociale: ${raw.ss_number || 'En attente'}, Séquence #${raw.inseso_sequence_number || 'N/A'}`
    });
  }

  // 7. Sanction (si existe)
  if (raw.total_sanctions && raw.total_sanctions > 0) {
    docs.push({
      id: `doc-${empId}-sanction`,
      employeeId: empId,
      name: `Notification Sanction - ${raw.last_sanction_type || 'Avertissement'}.pdf`,
      category: 'SANCTION',
      uploadDate: nowStr,
      size: 125000,
      type: 'application/pdf',
      notes: `Motif: ${raw.last_sanction_reason || 'Rappel à l\'ordre'}`
    });
  }

  return docs;
}

export const INITIAL_HR_EMPLOYEES: Employee[] = ALL_RAW.map((raw) => {
  const isForeign = !!raw.is_foreign;
  const contractType = isForeign ? 'TYPE_A' : 'TYPE_B';
  const status = isForeign ? 'EXPAT' : 'LOCAL';

  return {
    id: raw.employee_id,
    idNumber: raw.matricule || raw.employee_id,
    matriculeGL: raw.matricule,
    name: raw.full_name,
    position: raw.position || 'Employé',
    status,
    hireDate: raw.hire_date || '2024-03-11',
    contractType,
    createdAt: new Date().toISOString(),

    givenNames: raw.given_names,
    surnames: raw.surnames,
    sex: raw.sex,
    birthDate: raw.birth_date,
    birthYear: raw.birth_year,
    nationality: raw.nationality,
    nationalityCountry: raw.nationality_country,
    isForeign,
    maritalStatus: raw.marital_status,
    childrenCount: raw.children_count,
    address: raw.address,
    phone1: raw.phone_1,
    phone2: raw.phone_2,
    educationLevel: raw.education_level,

    idDocumentType: raw.id_document_type,
    idDocumentNumber: raw.id_document_number,
    idDocumentNumberAtInseso: raw.id_document_number_at_inseso,

    employmentStatus: raw.employment_status || 'ACTIF',
    department: raw.department || 'EXPLOTACION',
    site: raw.site || 'MALABO',
    contractStartDate: raw.contract_start_date,
    contractEndDate: raw.contract_end_date,
    contractStatus: raw.contract_status || 'EN_COURS',
    seniorityYears: raw.seniority_years || 0,
    seniorityMonths: raw.seniority_months || 0,
    baseSalary: raw.base_salary,
    allowanceFood: !!raw.allowance_food,
    allowanceSpecial: !!raw.allowance_special,
    allowanceHousing: !!raw.allowance_housing,

    isInsured: raw.is_insured !== false,
    ssNumber: raw.ss_number,
    insesoSequenceNumber: raw.inseso_sequence_number,
    insesoDate: raw.inseso_date,

    workPermitRequired: !!raw.work_permit_required,
    workPermitNumber: raw.work_permit_number,
    workPermitStart: raw.work_permit_start,
    workPermitExpiry: raw.work_permit_expiry,
    workPermitState: raw.work_permit_state,

    residenceRequired: !!raw.residence_required,
    residenceStart: raw.residence_start,
    residenceExpiry: raw.residence_expiry,
    residenceState: raw.residence_state,

    drivingLicenceRequired: !!raw.driving_licence_required,
    drivingLicenceNumber: raw.driving_licence_number,
    drivingLicenceStart: raw.driving_licence_start,
    drivingLicenceExpiry: raw.driving_licence_expiry,
    drivingLicenceState: raw.driving_licence_state,

    annualLeaveDays: raw.annual_leave_days,
    leaveRequestsCount: raw.leave_requests_count,
    leaveRequestDates: raw.leave_request_dates,

    totalSanctions: raw.total_sanctions || 0,
    totalSuspensionDays: raw.total_suspension_days || 0,
    sanctionDates: raw.sanction_dates,
    lastSanctionDate: raw.last_sanction_date,
    lastSanctionType: raw.last_sanction_type,
    lastSanctionReason: raw.last_sanction_reason,

    overallState: raw.overall_state || 'EN_REGLE',
    stateReasons: raw.state_reasons,
    openItemsToComplete: raw.open_items_to_complete || 0,
    openItemsToVerify: raw.open_items_to_verify || 0,
    openItemsDetail: raw.open_items_detail,
    age: raw.age,

    documents: createDefaultDocuments(raw)
  };
});
