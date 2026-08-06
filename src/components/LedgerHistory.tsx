import React, { useState } from 'react';
import { 
  FileText, 
  Trash2, 
  Search, 
  Calendar, 
  Plus, 
  Banknote,
  Download,
  Globe,
  Building2,
  Filter
} from 'lucide-react';
import { Employee, EmployeeStatus, LeaveRecord, LeaveType } from '../types';
import { LEAVE_TYPE_LABELS, LEAVE_TYPE_COLORS } from '../utils/vacationCalc';

interface LedgerHistoryProps {
  employees: Employee[];
  leaveRecords: LeaveRecord[];
  onDeleteLeaveRecord: (id: string) => void;
  onOpenLeaveModal: () => void;
}

export const LedgerHistory: React.FC<LedgerHistoryProps> = ({
  employees,
  leaveRecords,
  onDeleteLeaveRecord,
  onOpenLeaveModal,
}) => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | EmployeeStatus>('ALL');
  const [selectedLeaveType, setSelectedLeaveType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const employeeMap = new Map<string, Employee>();
  employees.forEach((emp) => employeeMap.set(emp.id, emp));

  const filteredRecords = leaveRecords.filter((rec) => {
    const emp = employeeMap.get(rec.employeeId);
    const matchesEmp = selectedEmployeeId === 'ALL' || rec.employeeId === selectedEmployeeId;
    const matchesStatus = selectedStatus === 'ALL' || emp?.status === selectedStatus;
    const matchesType = selectedLeaveType === 'ALL' || rec.leaveType === selectedLeaveType;
    const matchesSearch =
      (emp?.name.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (emp?.idNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (emp?.position?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (rec.notes?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    return matchesEmp && matchesStatus && matchesType && matchesSearch;
  });

  // Tri par date décroissante
  const sortedRecords = [...filteredRecords].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );

  const handleExportCSV = () => {
    if (sortedRecords.length === 0) {
      alert("Aucun enregistrement de congé à exporter dans la liste filtrée.");
      return;
    }

    const headers = [
      "N° Matricule",
      "Nom & Prénom",
      "Poste / Fonction",
      "Statut Contractuel",
      "Type de Contrat",
      "Type de Congé",
      "Date Début",
      "Date Fin",
      "Nombre de Jours",
      "Rémunération",
      "Remarques / Justificatifs"
    ];

    const escapeCSV = (str: string | number | undefined | null) => {
      if (str === undefined || str === null) return '""';
      const stringified = String(str).replace(/"/g, '""');
      return `"${stringified}"`;
    };

    const rows = sortedRecords.map((rec) => {
      const emp = employeeMap.get(rec.employeeId);
      const leaveLabel = LEAVE_TYPE_LABELS[rec.leaveType] || rec.leaveType;
      const statusLabel = emp?.status === 'EXPAT' ? 'Expatrié (EXPAT)' : 'Personnel Local (LOCAL)';
      const contractLabel = emp?.contractType === 'TYPE_A' ? 'Type A (30j/6m)' : emp?.contractType === 'TYPE_B' ? 'Type B (30j/1an)' : 'Inconnu';
      const remunLabel = rec.isPaid !== false ? 'Payé (Rémunéré)' : 'Sans Solde (Non payé)';

      return [
        escapeCSV(emp?.idNumber || 'SANS-MAT'),
        escapeCSV(emp?.name || 'Inconnu'),
        escapeCSV(emp?.position || ''),
        escapeCSV(statusLabel),
        escapeCSV(contractLabel),
        escapeCSV(leaveLabel),
        escapeCSV(rec.startDate),
        escapeCSV(rec.endDate),
        escapeCSV(rec.daysCount),
        escapeCSV(remunLabel),
        escapeCSV(rec.notes || '')
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `journal_conges_rh_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Journal Comptable des Congés & Saisies Passées</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Historique complet avec N° Matricule, Poste, Statut (Local / Expatrié) et justification.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <button
            id="btn-export-csv"
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer active:scale-98"
            title="Exporter la liste filtrée au format CSV pour Excel"
          >
            <Download className="w-4 h-4 text-emerald-200" />
            Exporter en CSV ({sortedRecords.length})
          </button>
          <button
            onClick={onOpenLeaveModal}
            className="inline-flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer active:scale-98"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            Nouvelle Entrée au Journal
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher par Nom, Matricule, Poste ou motif..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-xs bg-stone-50 text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all font-medium"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Statut Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-bold text-stone-400 uppercase text-[10px] tracking-wider">Statut:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50 text-stone-900 text-xs font-semibold focus:bg-white focus:outline-none"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="LOCAL">Personnel Local</option>
              <option value="EXPAT">Expatriés</option>
            </select>
          </div>

          {/* Employé Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-bold text-stone-400 uppercase text-[10px] tracking-wider">Employé:</span>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50 text-stone-900 text-xs font-semibold focus:bg-white focus:outline-none max-w-[200px]"
            >
              <option value="ALL">Tous les employés</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  [{emp.idNumber || 'SANS-MAT'}] {emp.name} ({emp.status})
                </option>
              ))}
            </select>
          </div>

          {/* Leave Type Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-bold text-stone-400 uppercase text-[10px] tracking-wider">Type:</span>
            <select
              value={selectedLeaveType}
              onChange={(e) => setSelectedLeaveType(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50 text-stone-900 text-xs font-semibold focus:bg-white focus:outline-none"
            >
              <option value="ALL">Tous les types</option>
              {(Object.keys(LEAVE_TYPE_LABELS) as LeaveType[]).map((t) => (
                <option key={t} value={t}>
                  {LEAVE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        {sortedRecords.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText className="w-10 h-10 text-stone-300 mx-auto" />
            <p className="text-stone-700 font-semibold text-base">Aucune saisie trouvée</p>
            <p className="text-stone-400 text-xs max-w-sm mx-auto">
              {searchTerm || selectedEmployeeId !== 'ALL' || selectedStatus !== 'ALL' || selectedLeaveType !== 'ALL'
                ? 'Essayez de modifier vos filtres de recherche.'
                : 'Commencez par enregistrer une première demande ou congé au journal.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-200/80 text-stone-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-6">Employé & Matricule</th>
                  <th className="py-3.5 px-6">Poste & Statut</th>
                  <th className="py-3.5 px-6">Catégorie</th>
                  <th className="py-3.5 px-6">Période (Du / Au)</th>
                  <th className="py-3.5 px-6">Jours</th>
                  <th className="py-3.5 px-6">Rémunération</th>
                  <th className="py-3.5 px-6">Remarques / Accords</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-sm text-stone-700">
                {sortedRecords.map((rec) => {
                  const emp = employeeMap.get(rec.employeeId);
                  const colors = LEAVE_TYPE_COLORS[rec.leaveType];
                  const isPaid = rec.isPaid !== false;

                  return (
                    <tr key={rec.id} className="hover:bg-stone-50/60 transition-colors">
                      {/* Employé & Matricule */}
                      <td className="py-4 px-6 font-semibold text-stone-900">
                        {emp ? (
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-stone-900">{emp.name}</p>
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-stone-100 text-stone-700 border border-stone-200">
                                {emp.idNumber || 'SANS-MAT'}
                              </span>
                            </div>
                            <span className="text-2xs text-stone-400">
                              Contrat {emp.contractType === 'TYPE_A' ? 'Type A (30j/6m)' : 'Type B (30j/1an)'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-stone-400 italic">Employé Inconnu</span>
                        )}
                      </td>

                      {/* Poste & Statut */}
                      <td className="py-4 px-6">
                        {emp ? (
                          <div className="space-y-1">
                            <p className="text-xs text-stone-700 font-medium">{emp.position || 'Collaborateur'}</p>
                            {emp.status === 'EXPAT' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                                <Globe className="w-3 h-3 text-purple-700" />
                                EXPAT
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-900 border border-teal-300">
                                <Building2 className="w-3 h-3 text-teal-700" />
                                LOCAL
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-stone-400">-</span>
                        )}
                      </td>

                      {/* Type */}
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${colors.bg} ${colors.text} ${colors.border}`}>
                          {LEAVE_TYPE_LABELS[rec.leaveType]}
                        </span>
                      </td>

                      {/* Période */}
                      <td className="py-4 px-6 text-xs text-stone-600">
                        <div className="flex items-center gap-1 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-stone-400" />
                          {new Date(rec.startDate).toLocaleDateString('fr-FR')} → {new Date(rec.endDate).toLocaleDateString('fr-FR')}
                        </div>
                      </td>

                      {/* Jours */}
                      <td className="py-4 px-6 font-mono font-bold text-stone-900 text-sm">
                        -{rec.daysCount} jours
                      </td>

                      {/* Rémunération */}
                      <td className="py-4 px-6">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                            <Banknote className="w-3.5 h-3.5 text-emerald-700" />
                            Payé
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                            Sans Solde
                          </span>
                        )}
                      </td>

                      {/* Remarques */}
                      <td className="py-4 px-6 text-xs text-stone-500 max-w-xs truncate">
                        {rec.notes || <span className="italic text-stone-300">Aucune</span>}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => {
                            if (window.confirm('Êtes-vous sûr de vouloir supprimer cette saisie d\'absence ?')) {
                              onDeleteLeaveRecord(rec.id);
                            }
                          }}
                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Supprimer la saisie"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
