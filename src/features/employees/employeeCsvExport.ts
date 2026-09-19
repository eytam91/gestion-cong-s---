import { Employee, LeaveRecord } from '@/types';
import { calculateEmployeeStats } from '@/features/leave/vacationCalc';

const HEADERS = [
  'N° Matricule',
  'Nom & Prénom',
  'Poste / Fonction',
  'Statut Contractuel',
  'Type de Contrat',
  "Date d'Embauche",
  'Jours Acquis (Travail)',
  'Congés Payés Consommés (j)',
  'Solde Actuel (j)',
  'Solde Négatif (j)',
  'Jours Régularisation Estimés',
];

/**
 * Exports the roster as semicolon-separated CSV with a BOM, which is what Excel
 * in a French locale expects.
 */
export function exportEmployeesToCsv(employees: Employee[], leaveRecords: LeaveRecord[]): void {
  if (employees.length === 0) {
    throw new Error('Aucun employé à exporter.');
  }

  const rows = employees.map((emp) => {
    const stats = calculateEmployeeStats(emp, leaveRecords);
    return [
      emp.idNumber || '',
      emp.name,
      emp.position || '',
      emp.status === 'EXPAT' ? 'Expatrié (EXPAT)' : 'Personnel Local (LOCAL)',
      emp.contractType === 'TYPE_A' ? 'Type A (30j/6m)' : 'Type B (30j/12m)',
      emp.hireDate,
      stats.totalAccruedDays.toFixed(2),
      stats.totalLeaveTakenDays.toFixed(1),
      stats.balanceDays.toFixed(2),
      stats.isDebt ? stats.debtDays.toFixed(2) : '0',
      stats.isDebt ? stats.daysToPayback : '0',
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(';');
  });

  const csv = '﻿' + [HEADERS.join(';'), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `liste_employes_rh_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
