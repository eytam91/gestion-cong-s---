import React, { useState } from 'react';
import { 
  UserPlus, 
  Users, 
  Search, 
  Trash2, 
  Edit3, 
  Calendar, 
  Check, 
  X, 
  Briefcase, 
  BadgeCheck, 
  Clock, 
  Plus, 
  AlertTriangle,
  FileText,
  Banknote,
  History,
  Globe,
  Building2,
  FileSpreadsheet,
  Download,
  Filter,
  Hash,
  Sparkles
} from 'lucide-react';
import { Employee, ContractType, EmployeeStatus, LeaveRecord } from '../types';
import { calculateEmployeeStats, LEAVE_TYPE_LABELS } from '../utils/vacationCalc';
import { EmployeeImportModal } from './EmployeeImportModal';

interface EmployeeManagerProps {
  employees: Employee[];
  leaveRecords: LeaveRecord[];
  onAddEmployee: (employee: Omit<Employee, 'id' | 'createdAt'>) => void;
  onUpdateEmployee: (employee: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onBatchImportEmployees: (employees: Employee[]) => Promise<void>;
  onOpenLeaveModal: (employeeId: string) => void;
}

export const EmployeeManager: React.FC<EmployeeManagerProps> = ({
  employees,
  leaveRecords,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onBatchImportEmployees,
  onOpenLeaveModal,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | EmployeeStatus>('ALL');
  const [contractFilter, setContractFilter] = useState<'ALL' | ContractType>('ALL');
  const [selectedEmployeeDetailId, setSelectedEmployeeDetailId] = useState<string | null>(null);

  // Form Fields
  const [idNumber, setIdNumber] = useState('');
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [status, setStatus] = useState<EmployeeStatus>('LOCAL');
  const [hireDate, setHireDate] = useState(new Date().toISOString().split('T')[0]);
  const [contractType, setContractType] = useState<ContractType>('TYPE_A');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleOpenAddForm = () => {
    setEditingEmployee(null);
    setIdNumber(`MAT-${String(employees.length + 1).padStart(4, '0')}`);
    setName('');
    setPosition('');
    setStatus('LOCAL');
    setHireDate(new Date().toISOString().split('T')[0]);
    setContractType('TYPE_A');
    setErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (emp: Employee) => {
    setEditingEmployee(emp);
    setIdNumber(emp.idNumber || '');
    setName(emp.name);
    setPosition(emp.position || '');
    setStatus(emp.status || 'LOCAL');
    setHireDate(emp.hireDate);
    setContractType(emp.contractType);
    setErrors({});
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    const errs: { [key: string]: string } = {};
    if (!name.trim()) errs.name = 'Le nom de l\'employé est obligatoire.';
    if (!idNumber.trim()) errs.idNumber = 'Le N° Matricule / ID est obligatoire.';
    if (!position.trim()) errs.position = 'Le poste / fonction est obligatoire.';
    if (!hireDate) errs.hireDate = 'La date d\'embauche est obligatoire.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (editingEmployee) {
      onUpdateEmployee({
        ...editingEmployee,
        idNumber: idNumber.trim(),
        name: name.trim(),
        position: position.trim(),
        status,
        hireDate,
        contractType,
      });
    } else {
      onAddEmployee({
        idNumber: idNumber.trim(),
        name: name.trim(),
        position: position.trim(),
        status,
        hireDate,
        contractType,
      });
    }

    setIsFormOpen(false);
  };

  const handleExportEmployeesCsv = () => {
    if (employees.length === 0) {
      alert("Aucun employé à exporter.");
      return;
    }

    const headers = [
      "N° Matricule",
      "Nom & Prénom",
      "Poste / Fonction",
      "Statut Contractuel",
      "Type de Contrat",
      "Date d'Embauche",
      "Jours Acquis (Travail)",
      "Congés Payés Consommés (j)",
      "Solde Actuel (j)",
      "Solde Négatif (j)",
      "Jours Régularisation Estimés"
    ];

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
        stats.isDebt ? stats.daysToPayback : '0'
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `liste_employes_rh_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredEmployees = employees.filter((emp) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      emp.name.toLowerCase().includes(term) ||
      (emp.idNumber && emp.idNumber.toLowerCase().includes(term)) ||
      (emp.position && emp.position.toLowerCase().includes(term));

    const matchesStatus = statusFilter === 'ALL' || emp.status === statusFilter;
    const matchesContract = contractFilter === 'ALL' || emp.contractType === contractFilter;

    return matchesSearch && matchesStatus && matchesContract;
  });

  const countLocal = employees.filter(e => e.status === 'LOCAL').length;
  const countExpat = employees.filter(e => e.status === 'EXPAT').length;
  const countTypeA = employees.filter(e => e.contractType === 'TYPE_A').length;
  const countTypeB = employees.filter(e => e.contractType === 'TYPE_B').length;

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeDetailId);
  const selectedEmpStats = selectedEmployee ? calculateEmployeeStats(selectedEmployee, leaveRecords) : null;
  const selectedEmpRecords = selectedEmployee ? leaveRecords.filter((r) => r.employeeId === selectedEmployee.id) : [];

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <span>Gestion des Effectifs & Statuts RH</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 font-mono font-bold">
              {employees.length} employé(s)
            </span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Renseignez N° Matricule, Fonction, Statut (Personnel Local vs Expatrié) et Cycle de Congés.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleExportEmployeesCsv}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-stone-50 text-stone-800 text-xs font-bold px-3.5 py-2.5 rounded-xl border border-stone-200 shadow-2xs transition-all cursor-pointer active:scale-98"
          >
            <Download className="w-4 h-4 text-stone-600" />
            <span>Exporter CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-950 text-xs font-bold px-3.5 py-2.5 rounded-xl border border-amber-300 shadow-2xs transition-all cursor-pointer active:scale-98"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-700" />
            <span>Importer Excel / CSV</span>
          </button>

          <button
            id="btn-add-employee-modal"
            onClick={handleOpenAddForm}
            className="inline-flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer active:scale-98"
          >
            <UserPlus className="w-4 h-4 text-amber-400" />
            <span>Ajouter un Employé</span>
          </button>
        </div>
      </div>

      {/* Add / Edit Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-stone-900 text-white flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900">
                    {editingEmployee ? `Modifier : ${editingEmployee.name}` : 'Nouvel Employé'}
                  </h3>
                  <p className="text-2xs text-stone-500">Formulaire d'identification et profil contractuel</p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* N° Matricule & Nom */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-2xs font-bold text-stone-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Hash className="w-3 h-3 text-stone-500" />
                    N° Matricule *
                  </label>
                  <input
                    type="text"
                    placeholder="MAT-0001"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border bg-stone-50 font-mono font-bold text-stone-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all ${
                      errors.idNumber ? 'border-red-400' : 'border-stone-200'
                    }`}
                  />
                  {errors.idNumber && <p className="text-2xs text-red-500 font-medium mt-1">{errors.idNumber}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-2xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Nom & Prénom de l'employé *
                  </label>
                  <input
                    type="text"
                    placeholder="ex: Karim Alami"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border bg-stone-50 text-stone-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all ${
                      errors.name ? 'border-red-400' : 'border-stone-200'
                    }`}
                  />
                  {errors.name && <p className="text-2xs text-red-500 font-medium mt-1">{errors.name}</p>}
                </div>
              </div>

              {/* Poste / Fonction */}
              <div>
                <label className="block text-2xs font-bold text-stone-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Briefcase className="w-3 h-3 text-stone-500" />
                  Poste / Fonction *
                </label>
                <input
                  type="text"
                  placeholder="ex: Ingénieur Projet, Responsable RH, Superviseur Site"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border bg-stone-50 text-stone-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all ${
                    errors.position ? 'border-red-400' : 'border-stone-200'
                  }`}
                />
                {errors.position && <p className="text-2xs text-red-500 font-medium mt-1">{errors.position}</p>}
              </div>

              {/* Statut Contractuel (Personnel Local vs Expatrié) */}
              <div>
                <label className="block text-2xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Statut Contractuel (LOCAL vs EXPAT)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setStatus('LOCAL')}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      status === 'LOCAL'
                        ? 'bg-teal-50 border-teal-500 text-teal-950 font-bold ring-2 ring-teal-500/20'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${status === 'LOCAL' ? 'bg-teal-600 text-white' : 'bg-stone-200 text-stone-600'}`}>
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">Personnel Local</div>
                      <div className="text-[10px] text-stone-500 font-normal">Contrat Local / National</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus('EXPAT')}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      status === 'EXPAT'
                        ? 'bg-purple-50 border-purple-500 text-purple-950 font-bold ring-2 ring-purple-500/20'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${status === 'EXPAT' ? 'bg-purple-600 text-white' : 'bg-stone-200 text-stone-600'}`}>
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">Expatrié (EXPAT)</div>
                      <div className="text-[10px] text-stone-500 font-normal">Personnel Détaché / Étranger</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Date d'Embauche */}
              <div>
                <label className="block text-2xs font-bold text-stone-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-stone-500" />
                  Date d'embauche *
                </label>
                <input
                  type="date"
                  value={hireDate}
                  onChange={(e) => setHireDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all"
                />
              </div>

              {/* Type de Contrat & Cycle de Congés */}
              <div>
                <label className="block text-2xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Cycle de Congés & Droits
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex flex-col p-3 rounded-xl border cursor-pointer text-xs transition-all ${
                      contractType === 'TYPE_A'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold ring-1 ring-emerald-500/30'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      <input
                        type="radio"
                        name="contractType"
                        value="TYPE_A"
                        checked={contractType === 'TYPE_A'}
                        onChange={() => setContractType('TYPE_A')}
                        className="sr-only"
                      />
                      <BadgeCheck className="w-4 h-4 text-emerald-600" />
                      TYPE_A (6 mois)
                    </div>
                    <span className="text-[10px] font-normal text-stone-500">
                      • 30 jours / 6 mois<br />
                      • ~0.1644 j/jour<br />
                      • Cycle semestriel
                    </span>
                  </label>

                  <label
                    className={`flex flex-col p-3 rounded-xl border cursor-pointer text-xs transition-all ${
                      contractType === 'TYPE_B'
                        ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold ring-1 ring-blue-500/30'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      <input
                        type="radio"
                        name="contractType"
                        value="TYPE_B"
                        checked={contractType === 'TYPE_B'}
                        onChange={() => setContractType('TYPE_B')}
                        className="sr-only"
                      />
                      <Briefcase className="w-4 h-4 text-blue-600" />
                      TYPE_B (12 mois)
                    </div>
                    <span className="text-[10px] font-normal text-stone-500">
                      • 30 jours / an<br />
                      • ~0.0822 j/jour<br />
                      • Cycle annuel
                    </span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer active:scale-98"
                >
                  {editingEmployee ? 'Enregistrer les modifications' : 'Créer l\'employé'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher par Nom, N° Matricule, ou Poste..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-xs bg-stone-50 text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all font-medium"
            />
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Statut:
            </span>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Tous ({employees.length})
            </button>
            <button
              onClick={() => setStatusFilter('LOCAL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'LOCAL'
                  ? 'bg-teal-700 text-white shadow-2xs'
                  : 'bg-teal-50 text-teal-900 border border-teal-200 hover:bg-teal-100'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Personnel Local ({countLocal})
            </button>
            <button
              onClick={() => setStatusFilter('EXPAT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'EXPAT'
                  ? 'bg-purple-700 text-white shadow-2xs'
                  : 'bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              Expatriés ({countExpat})
            </button>
          </div>

          {/* Contract Filter Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider shrink-0">
              Contrat:
            </span>
            <button
              onClick={() => setContractFilter('ALL')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                contractFilter === 'ALL'
                  ? 'bg-stone-800 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setContractFilter('TYPE_A')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                contractFilter === 'TYPE_A'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              Type A ({countTypeA})
            </button>
            <button
              onClick={() => setContractFilter('TYPE_B')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                contractFilter === 'TYPE_B'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
              }`}
            >
              Type B ({countTypeB})
            </button>
          </div>

        </div>
      </div>

      {/* Employees Grid */}
      {filteredEmployees.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center mx-auto">
            <Users className="w-7 h-7 text-amber-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900">
              {employees.length === 0 ? "Aucun employé enregistré pour le moment" : "Aucun employé ne correspond aux filtres"}
            </h3>
            <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
              {employees.length === 0 
                ? "Commencez par ajouter votre premier collaborateur ou importez directement une liste complète depuis un fichier Excel / CSV." 
                : "Essayez de modifier votre recherche ou vos filtres de statut."}
            </p>
          </div>

          {employees.length === 0 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={handleOpenAddForm}
                className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-amber-400" />
                <span>Créer le Premier Employé</span>
              </button>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-950 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-amber-700" />
                <span>Importer Liste Excel / CSV</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEmployees.map((emp) => {
            const stats = calculateEmployeeStats(emp, leaveRecords);

            return (
              <div
                key={emp.id}
                className="bg-white rounded-2xl border border-stone-200/80 shadow-xs hover:border-stone-300 transition-all p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Top Card Info */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-2xs ${
                          emp.status === 'EXPAT' ? 'bg-purple-900' : 'bg-stone-900'
                        }`}>
                          {emp.name.charAt(0)}
                        </div>
                        {stats.isDebt && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-600 border-2 border-white ring-2 ring-red-400/50" title="Solde négatif à régulariser" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-stone-900 text-base">{emp.name}</h3>
                        </div>
                        <p className="text-xs font-medium text-stone-600">{emp.position || 'Collaborateur'}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-2xs font-bold px-1.5 py-0.2 rounded bg-stone-100 text-stone-700 border border-stone-200">
                            {emp.idNumber || 'SANS-MAT'}
                          </span>
                          <span className="text-[11px] text-stone-400">• Embauché le {new Date(emp.hireDate).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {/* Status Badge (LOCAL vs EXPAT) */}
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

                      {/* Contract Badge */}
                      {emp.contractType === 'TYPE_A' ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Type A (6m)
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          Type B (1an)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Solde Card Status */}
                  <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/70 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-stone-500 font-medium">Solde de Congés:</span>
                      {stats.isDebt ? (
                        <span className="font-extrabold text-red-700 bg-red-100 px-2 py-0.5 rounded-md border border-red-300 flex items-center gap-1 font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                          -{stats.debtDays.toFixed(1)} j (Négatif)
                        </span>
                      ) : (
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono">
                          +{stats.balanceDays.toFixed(1)} j
                        </span>
                      )}
                    </div>

                    {stats.isDebt ? (
                      <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-2xs space-y-1">
                        <p className="font-extrabold text-red-700 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span>Doit régulariser <strong>{stats.debtDays.toFixed(1)} jour(s)</strong></span>
                        </p>
                        <p className="text-stone-600 pl-5">
                          Délai estimé: ~{stats.daysToPayback} jours de travail
                        </p>
                      </div>
                    ) : (
                      <div className="text-2xs text-emerald-700 font-medium flex items-center gap-1">
                        <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Acquis par travail : +{stats.totalAccruedDays.toFixed(1)} j
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                  <button
                    onClick={() => onOpenLeaveModal(emp.id)}
                    className="inline-flex items-center gap-1 text-xs font-bold bg-stone-900 hover:bg-stone-800 text-white px-3 py-1.5 rounded-lg transition-all cursor-pointer active:scale-98"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    Saisir Congé
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedEmployeeDetailId(emp.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold rounded-lg text-xs transition-all shadow-2xs cursor-pointer active:scale-98"
                      title="Consulter l'historique détaillé des congés"
                    >
                      <History className="w-3.5 h-3.5" />
                      Historique
                    </button>
                    <button
                      onClick={() => handleOpenEditForm(emp)}
                      className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg cursor-pointer"
                      title="Modifier employé"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteEmployee(emp.id)}
                      className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                      title="Supprimer employé"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Employee Detail Modal */}
      {selectedEmployee && selectedEmpStats && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl text-white font-bold text-base flex items-center justify-center ${
                  selectedEmployee.status === 'EXPAT' ? 'bg-purple-900' : 'bg-stone-900'
                }`}>
                  {selectedEmployee.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-stone-900">
                      {selectedEmployee.name}
                    </h3>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-800 border border-stone-200">
                      {selectedEmployee.idNumber || 'SANS-MAT'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {selectedEmployee.position} • {selectedEmployee.status === 'EXPAT' ? 'Expatrié (EXPAT)' : 'Personnel Local (LOCAL)'} • Contrat {selectedEmployee.contractType} (Embauché le {new Date(selectedEmployee.hireDate).toLocaleDateString('fr-FR')})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmployeeDetailId(null)}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Solde & Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200">
                <p className="text-2xs font-bold text-stone-400 uppercase">Jours Acquis Total</p>
                <p className="text-lg font-bold text-emerald-700 mt-1 font-mono">+{selectedEmpStats.totalAccruedDays.toFixed(1)} j</p>
              </div>

              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200">
                <p className="text-2xs font-bold text-stone-400 uppercase">Congés Payés Pris</p>
                <p className="text-lg font-bold text-stone-900 mt-1 font-mono">{selectedEmpStats.totalLeaveTakenDays} j</p>
              </div>

              <div className={`p-3.5 rounded-xl border ${selectedEmpStats.isDebt ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <p className="text-2xs font-bold uppercase text-stone-500">Solde Actuel (Solde)</p>
                <p className={`text-lg font-bold mt-1 font-mono ${selectedEmpStats.isDebt ? 'text-red-700' : 'text-emerald-700'}`}>
                  {selectedEmpStats.isDebt ? `-${selectedEmpStats.debtDays.toFixed(1)} j` : `+${selectedEmpStats.balanceDays.toFixed(1)} j`}
                </p>
              </div>
            </div>

            {/* Indication if employee passed allocated days */}
            {selectedEmpStats.isDebt && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-red-900">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Dépassement des Jours Acquis (+{selectedEmpStats.exceededDays.toFixed(1)} jours en avance)</span>
                </div>
                <p className="text-red-800 text-2xs leading-relaxed">
                  L'employé a consommé {selectedEmpStats.totalLeaveTakenDays} jours de congé payé pour {selectedEmpStats.totalAccruedDays.toFixed(1)} jours accumulés par son travail. Il lui faudra environ <strong>~{selectedEmpStats.daysToPayback} jours de travail</strong> pour régulariser ce solde négatif.
                </p>
              </div>
            )}

            {/* Detail History List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-stone-600" />
                  <span>Historique des Congés & Absences</span>
                  <span className="text-2xs text-stone-400 font-normal">({selectedEmpRecords.length} enregistrement(s))</span>
                </h4>
                <button
                  onClick={() => {
                    const empId = selectedEmployee.id;
                    setSelectedEmployeeDetailId(null);
                    onOpenLeaveModal(empId);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold bg-amber-400 hover:bg-amber-300 text-stone-950 px-3 py-1.5 rounded-lg transition-all shadow-2xs cursor-pointer active:scale-98"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Saisir Congé
                </button>
              </div>

              {selectedEmpRecords.length === 0 ? (
                <p className="text-xs text-stone-400 italic py-4 text-center">Aucune absence enregistrée pour cet employé.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedEmpRecords.map((rec) => (
                    <div key={rec.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-900">{LEAVE_TYPE_LABELS[rec.leaveType]}</span>
                          {rec.isPaid === false ? (
                            <span className="px-1.5 py-0.5 rounded text-3xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                              Sans solde
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-3xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                              Payé
                            </span>
                          )}
                        </div>
                        <p className="text-2xs text-stone-500 mt-0.5">
                          Du {new Date(rec.startDate).toLocaleDateString('fr-FR')} au {new Date(rec.endDate).toLocaleDateString('fr-FR')} {rec.notes ? `• ${rec.notes}` : ''}
                        </p>
                      </div>
                      <span className="font-bold font-mono text-stone-900 shrink-0">
                        {rec.daysCount} jours
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-stone-100">
              <button
                onClick={() => setSelectedEmployeeDetailId(null)}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      <EmployeeImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportEmployees={onBatchImportEmployees}
        existingEmployees={employees}
      />
    </div>
  );
};
