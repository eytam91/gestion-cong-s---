import React, { useState, useEffect } from 'react';
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
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  FileCheck,
  User,
  UserCheck,
  RotateCcw
} from 'lucide-react';
import { Employee, ContractType, EmployeeStatus, LeaveRecord, HRComplianceState } from '../types';
import { calculateEmployeeStats, LEAVE_TYPE_LABELS } from '../utils/vacationCalc';
import { EmployeeImportModal } from './EmployeeImportModal';
import { ConfirmModal } from './ConfirmModal';
import { EmployeeDetailPage } from './EmployeeDetailPage';
import { exportEmployeesToExcel } from '../utils/excelImportExport';

interface EmployeeManagerProps {
  employees: Employee[];
  leaveRecords: LeaveRecord[];
  onAddEmployee: (employee: Omit<Employee, 'id' | 'createdAt'>) => void;
  onUpdateEmployee: (employee: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onBatchImportEmployees: (employees: Employee[]) => Promise<void>;
  onOpenLeaveModal: (employeeId: string) => void;
  initialSelectedEmployeeId?: string | null;
  canDelete?: boolean;
}

export const EmployeeManager: React.FC<EmployeeManagerProps> = ({
  employees,
  leaveRecords,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onBatchImportEmployees,
  onOpenLeaveModal,
  initialSelectedEmployeeId,
  canDelete = true,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchNom, setSearchNom] = useState('');
  const [searchPrenom, setSearchPrenom] = useState('');
  const [searchMatricule, setSearchMatricule] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | EmployeeStatus>('ALL');
  const [contractFilter, setContractFilter] = useState<'ALL' | ContractType>('ALL');
  const [complianceFilter, setComplianceFilter] = useState<'ALL' | HRComplianceState>('ALL');
  const [selectedEmployeeDetailId, setSelectedEmployeeDetailId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'info' | 'error' | 'success'; text: string } | null>(null);

  // Sync initial selected employee when navigating from Dashboard
  useEffect(() => {
    if (initialSelectedEmployeeId) {
      setSelectedEmployeeDetailId(initialSelectedEmployeeId);
    }
  }, [initialSelectedEmployeeId]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Form Fields
  const [idNumber, setIdNumber] = useState('');
  const [matriculeGL, setMatriculeGL] = useState('');
  const [nationality, setNationality] = useState('');
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [status, setStatus] = useState<EmployeeStatus>('LOCAL');
  const [hireDate, setHireDate] = useState(new Date().toISOString().split('T')[0]);
  const [contractType, setContractType] = useState<ContractType>('TYPE_A');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmittedAttempt, setIsSubmittedAttempt] = useState(false);

  // Confirmation Modals State
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  const isFormDirty = (): boolean => {
    if (!isFormOpen) return false;
    if (editingEmployee) {
      return (
        idNumber.trim() !== (editingEmployee.idNumber || '') ||
        matriculeGL.trim() !== (editingEmployee.matriculeGL || '') ||
        nationality.trim() !== (editingEmployee.nationality || '') ||
        name.trim() !== editingEmployee.name ||
        position.trim() !== (editingEmployee.position || '') ||
        status !== editingEmployee.status ||
        hireDate !== editingEmployee.hireDate ||
        contractType !== editingEmployee.contractType
      );
    }
    return Boolean(name.trim() || position.trim() || idNumber.trim() || matriculeGL.trim() || nationality.trim());
  };

  const handleOpenAddForm = () => {
    setEditingEmployee(null);
    setIdNumber(`MAT-${String(employees.length + 1).padStart(4, '0')}`);
    setMatriculeGL(`GL-${String(employees.length + 1).padStart(4, '0')}`);
    setNationality('');
    setName('');
    setPosition('');
    setStatus('LOCAL');
    setHireDate(new Date().toISOString().split('T')[0]);
    setContractType('TYPE_A');
    setErrors({});
    setIsSubmittedAttempt(false);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (emp: Employee) => {
    setEditingEmployee(emp);
    setIdNumber(emp.idNumber || '');
    setMatriculeGL(emp.matriculeGL || '');
    setNationality(emp.nationality || '');
    setName(emp.name);
    setPosition(emp.position || '');
    setStatus(emp.status || 'LOCAL');
    setHireDate(emp.hireDate);
    setContractType(emp.contractType);
    setErrors({});
    setIsSubmittedAttempt(false);
    setIsFormOpen(true);
  };

  const handleRequestCloseForm = () => {
    if (isFormDirty()) {
      setShowCancelConfirmModal(true);
    } else {
      setIsFormOpen(false);
      setErrors({});
      setIsSubmittedAttempt(false);
    }
  };

  const validateForm = (): boolean => {
    const errs: { [key: string]: string } = {};

    // 1. Nom & Prénom
    const trimmedName = name.trim();
    if (!trimmedName) {
      errs.name = 'Le nom et prénom de l\'employé sont obligatoires.';
    } else if (trimmedName.length < 2) {
      errs.name = 'Le nom doit comporter au moins 2 caractères.';
    }

    // 2. N° Matricule
    const trimmedIdNumber = idNumber.trim();
    if (!trimmedIdNumber) {
      errs.idNumber = 'Le N° Matricule / ID unique est obligatoire.';
    } else if (trimmedIdNumber.length < 2) {
      errs.idNumber = 'Le N° Matricule doit comporter au moins 2 caractères (ex: MAT-001).';
    } else {
      // Check for uniqueness
      const isDuplicate = employees.some(
        (emp) => 
          emp.idNumber && 
          emp.idNumber.toLowerCase() === trimmedIdNumber.toLowerCase() &&
          (!editingEmployee || emp.id !== editingEmployee.id)
      );
      if (isDuplicate) {
        errs.idNumber = `Le matricule "${trimmedIdNumber}" est déjà attribué à un autre employé.`;
      }
    }

    // 3. Poste / Fonction
    const trimmedPos = position.trim();
    if (!trimmedPos) {
      errs.position = 'L\'intitulé du poste / fonction est obligatoire.';
    } else if (trimmedPos.length < 2) {
      errs.position = 'L\'intitulé du poste doit comporter au moins 2 caractères.';
    }

    // 4. Date d'embauche
    if (!hireDate) {
      errs.hireDate = 'La date d\'embauche est obligatoire.';
    } else {
      const parsedDate = new Date(hireDate);
      if (isNaN(parsedDate.getTime())) {
        errs.hireDate = 'Date d\'embauche invalide (format AAAA-MM-JJ requis).';
      } else {
        const year = parsedDate.getFullYear();
        if (year < 1970 || year > 2099) {
          errs.hireDate = 'Veuillez saisir une année valide entre 1970 et 2099.';
        }
      }
    }

    // 5. Statut & Type de contrat
    if (!status || (status !== 'LOCAL' && status !== 'EXPAT')) {
      errs.status = 'Veuillez sélectionner un statut contractuel valide (LOCAL ou EXPAT).';
    }
    if (!contractType || (contractType !== 'TYPE_A' && contractType !== 'TYPE_B')) {
      errs.contractType = 'Veuillez sélectionner un cycle de congés valide (Type A ou Type B).';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFormPreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittedAttempt(true);
    if (!validateForm()) {
      return;
    }
    // All requirements are fulfilled -> Open Confirmation Popup
    setShowSaveConfirmModal(true);
  };

  const handleExecuteSave = () => {
    setShowSaveConfirmModal(false);

    if (editingEmployee) {
      onUpdateEmployee({
        ...editingEmployee,
        idNumber: idNumber.trim(),
        matriculeGL: matriculeGL.trim(),
        nationality: nationality.trim(),
        name: name.trim(),
        position: position.trim(),
        status,
        hireDate,
        contractType,
      });
    } else {
      onAddEmployee({
        idNumber: idNumber.trim(),
        matriculeGL: matriculeGL.trim(),
        nationality: nationality.trim(),
        name: name.trim(),
        position: position.trim(),
        status,
        hireDate,
        contractType,
      });
    }

    setIsFormOpen(false);
    setIsSubmittedAttempt(false);
    setEditingEmployee(null);
  };

  const handleExportEmployeesExcel = () => {
    if (employees.length === 0) {
      setToastMessage({ type: 'info', text: 'Aucun collaborateur à exporter.' });
      return;
    }
    try {
      exportEmployeesToExcel(employees, leaveRecords);
      setToastMessage({ type: 'success', text: 'Export Excel généré avec succès.' });
    } catch (err: any) {
      setToastMessage({ type: 'error', text: "Erreur lors de l'export Excel : " + (err.message || 'Erreur inconnue') });
    }
  };

  const handleExportEmployeesCsv = () => {
    if (employees.length === 0) {
      setToastMessage({ type: 'info', text: 'Aucun collaborateur à exporter.' });
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

  // Normalisation pour recherche insensible aux accents et à la casse
  const normalizeText = (val?: string): string => {
    if (!val) return '';
    return val
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  };

  const hasActiveSearch = Boolean(
    searchNom.trim() ||
    searchPrenom.trim() ||
    searchMatricule.trim() ||
    searchTerm.trim()
  );

  const handleClearAllSearches = () => {
    setSearchNom('');
    setSearchPrenom('');
    setSearchMatricule('');
    setSearchTerm('');
  };

  const filteredEmployees = employees.filter((emp) => {
    const normNom = normalizeText(searchNom);
    const normPrenom = normalizeText(searchPrenom);
    const normMatricule = normalizeText(searchMatricule);
    const normGlobal = normalizeText(searchTerm);

    // 1. Filtrer par Nom (Nom de famille / Surnames ou nom complet)
    let matchesNom = true;
    if (normNom) {
      const surnamesNorm = normalizeText(emp.surnames);
      const nameNorm = normalizeText(emp.name);
      matchesNom = (Boolean(surnamesNorm) && surnamesNorm.includes(normNom)) || nameNorm.includes(normNom);
    }

    // 2. Filtrer par Prénom (Prénom / Given names ou nom complet)
    let matchesPrenom = true;
    if (normPrenom) {
      const givenNamesNorm = normalizeText(emp.givenNames);
      const nameNorm = normalizeText(emp.name);
      matchesPrenom = (Boolean(givenNamesNorm) && givenNamesNorm.includes(normPrenom)) || nameNorm.includes(normPrenom);
    }

    // 3. Filtrer par Matricule (Matricule RH idNumber ou Matricule GL)
    let matchesMatricule = true;
    if (normMatricule) {
      const idNumNorm = normalizeText(emp.idNumber);
      const glNorm = normalizeText(emp.matriculeGL);
      matchesMatricule = idNumNorm.includes(normMatricule) || glNorm.includes(normMatricule);
    }

    // 4. Filtrer par Recherche globale / mots-clés
    let matchesGlobal = true;
    if (normGlobal) {
      matchesGlobal =
        normalizeText(emp.name).includes(normGlobal) ||
        (Boolean(emp.surnames) && normalizeText(emp.surnames).includes(normGlobal)) ||
        (Boolean(emp.givenNames) && normalizeText(emp.givenNames).includes(normGlobal)) ||
        (Boolean(emp.idNumber) && normalizeText(emp.idNumber).includes(normGlobal)) ||
        (Boolean(emp.matriculeGL) && normalizeText(emp.matriculeGL).includes(normGlobal)) ||
        (Boolean(emp.position) && normalizeText(emp.position).includes(normGlobal)) ||
        (Boolean(emp.nationality) && normalizeText(emp.nationality).includes(normGlobal)) ||
        (Boolean(emp.department) && normalizeText(emp.department).includes(normGlobal));
    }

    const matchesStatus = statusFilter === 'ALL' || emp.status === statusFilter;
    const matchesContract = contractFilter === 'ALL' || emp.contractType === contractFilter;
    const matchesCompliance = complianceFilter === 'ALL' || 
      (complianceFilter === 'EN_REGLE' ? (emp.overallState === 'EN_REGLE' || !emp.overallState) : emp.overallState === complianceFilter);

    return matchesNom && matchesPrenom && matchesMatricule && matchesGlobal && matchesStatus && matchesContract && matchesCompliance;
  });

  const countLocal = employees.filter(e => e.status === 'LOCAL').length;
  const countExpat = employees.filter(e => e.status === 'EXPAT').length;
  const countTypeA = employees.filter(e => e.contractType === 'TYPE_A').length;
  const countTypeB = employees.filter(e => e.contractType === 'TYPE_B').length;

  const countEnRegle = employees.filter(e => e.overallState === 'EN_REGLE' || !e.overallState).length;
  const countARegulariser = employees.filter(e => e.overallState === 'A_REGULARISER').length;
  const countARenouveler = employees.filter(e => e.overallState === 'A_RENOUVELER').length;
  const countACompleter = employees.filter(e => e.overallState === 'A_COMPLETER_VERIFIER').length;

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeDetailId);

  // When an employee is selected, render their individual, comprehensive and structured page
  if (selectedEmployee) {
    return (
      <EmployeeDetailPage
        employee={selectedEmployee}
        leaveRecords={leaveRecords}
        allEmployees={employees}
        onBack={() => setSelectedEmployeeDetailId(null)}
        onUpdateEmployee={onUpdateEmployee}
        onDeleteEmployee={(id) => {
          onDeleteEmployee(id);
          setSelectedEmployeeDetailId(null);
        }}
        onOpenLeaveModal={onOpenLeaveModal}
        onSelectEmployee={(id) => setSelectedEmployeeDetailId(id)}
      />
    );
  }

  // Check if form is currently valid in real-time
  const isNameValid = name.trim().length >= 2;
  const isIdValid = idNumber.trim().length >= 2;
  const isPositionValid = position.trim().length >= 2;
  const isHireDateValid = Boolean(hireDate && !isNaN(new Date(hireDate).getTime()));
  const validFieldsCount = (isNameValid ? 1 : 0) + (isIdValid ? 1 : 0) + (isPositionValid ? 1 : 0) + (isHireDateValid ? 1 : 0);
  const isFormFullyValid = validFieldsCount === 4;

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
            Renseignez N° Matricule, Fonction, Statut (Personnel Local vs Expatrié) et Cycle de Congés avec validation stricte.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportEmployeesExcel}
            className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 text-xs font-bold px-3 py-2.5 rounded-xl border border-emerald-300 shadow-2xs transition-all cursor-pointer active:scale-98"
            title="Exporter l'ensemble de l'effectif avec soldes et calculs au format Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Exporter Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handleExportEmployeesCsv}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-stone-50 text-stone-800 text-xs font-bold px-3 py-2.5 rounded-xl border border-stone-200 shadow-2xs transition-all cursor-pointer active:scale-98"
          >
            <Download className="w-4 h-4 text-stone-600" />
            <span>Exporter CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer active:scale-98"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Importer Excel / CSV</span>
          </button>

          <button
            id="btn-add-employee-modal"
            onClick={handleOpenAddForm}
            className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer active:scale-98"
          >
            <UserPlus className="w-4 h-4" />
            <span>Ajouter un Employé</span>
          </button>
        </div>
      </div>

      {/* Add / Edit Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-stone-900 text-white flex items-center justify-center shadow-xs">
                  {editingEmployee ? <Edit3 className="w-5 h-5 text-amber-400" /> : <UserPlus className="w-5 h-5 text-amber-400" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900">
                    {editingEmployee ? `Modifier l'employé : ${editingEmployee.name}` : 'Nouvel Employé'}
                  </h3>
                  <p className="text-2xs text-stone-500">Tous les champs marqués d'une étoile (*) sont strictement requis</p>
                </div>
              </div>
              <button
                onClick={handleRequestCloseForm}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-100 transition-colors cursor-pointer"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Validation Banner if Errors exist */}
            {isSubmittedAttempt && Object.keys(errors).length > 0 && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-800">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Informations requises incomplètes ou invalides :</p>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5 text-2xs">
                    {Object.values(errors).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <form onSubmit={handleFormPreSubmit} className="space-y-4">
              {/* N° Matricule & Nom */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="sm:col-span-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-2xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1">
                      <Hash className="w-3 h-3 text-stone-500" />
                      Matricule RH *
                    </label>
                    {isIdValid && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="MAT-0001"
                    value={idNumber}
                    onChange={(e) => {
                      setIdNumber(e.target.value);
                      if (errors.idNumber) {
                        setErrors(prev => { const n = { ...prev }; delete n.idNumber; return n; });
                      }
                    }}
                    className={`w-full px-3 py-2 rounded-xl border bg-stone-50 font-mono font-bold text-stone-900 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all ${
                      errors.idNumber ? 'border-red-500 ring-2 ring-red-200 bg-red-50/30' : 'border-stone-200'
                    }`}
                  />
                  {errors.idNumber && <p className="text-2xs text-red-600 font-medium mt-1">{errors.idNumber}</p>}
                </div>
                
                <div className="sm:col-span-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-2xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1" title="ID Société / ID Entreprise">
                      <Hash className="w-3 h-3 text-stone-500" />
                      Matricule GL
                    </label>
                  </div>
                  <input
                    type="text"
                    placeholder="GL-0000"
                    value={matriculeGL}
                    onChange={(e) => setMatriculeGL(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 font-mono font-bold text-stone-900 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-2xs font-bold text-stone-700 uppercase tracking-wider">
                      Nom & Prénom de l'employé *
                    </label>
                    {isNameValid && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="ex: Karim Alami"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) {
                        setErrors(prev => { const n = { ...prev }; delete n.name; return n; });
                      }
                    }}
                    className={`w-full px-3 py-2 rounded-xl border bg-stone-50 text-stone-900 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all ${
                      errors.name ? 'border-red-500 ring-2 ring-red-200 bg-red-50/30' : 'border-stone-200'
                    }`}
                  />
                  {errors.name && <p className="text-2xs text-red-600 font-medium mt-1">{errors.name}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Poste / Fonction */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-2xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-stone-500" />
                      Poste / Fonction *
                    </label>
                    {isPositionValid && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="ex: Ingénieur Projet, Responsable RH"
                    value={position}
                    onChange={(e) => {
                      setPosition(e.target.value);
                      if (errors.position) {
                        setErrors(prev => { const n = { ...prev }; delete n.position; return n; });
                      }
                    }}
                    className={`w-full px-3 py-2 rounded-xl border bg-stone-50 text-stone-900 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all ${
                      errors.position ? 'border-red-500 ring-2 ring-red-200 bg-red-50/30' : 'border-stone-200'
                    }`}
                  />
                  {errors.position && <p className="text-2xs text-red-600 font-medium mt-1">{errors.position}</p>}
                </div>

                {/* Nationalité */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-2xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1">
                      <Globe className="w-3 h-3 text-stone-500" />
                      Nationalité
                    </label>
                  </div>
                  <input
                    type="text"
                    placeholder="ex: Sénégalaise, Française"
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all"
                  />
                </div>
              </div>

              {/* Statut Contractuel (Personnel Local vs Expatrié) */}
              <div>
                <label className="block text-2xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Statut Contractuel (LOCAL vs EXPAT) *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setStatus('LOCAL')}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      status === 'LOCAL'
                        ? 'bg-teal-50 border-teal-500 text-teal-950 font-bold ring-2 ring-teal-500/20'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${status === 'LOCAL' ? 'bg-teal-600 text-white' : 'bg-stone-200 text-stone-600'}`}>
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
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      status === 'EXPAT'
                        ? 'bg-purple-50 border-purple-500 text-purple-950 font-bold ring-2 ring-purple-500/20'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${status === 'EXPAT' ? 'bg-purple-600 text-white' : 'bg-stone-200 text-stone-600'}`}>
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
                <div className="flex items-center justify-between mb-1">
                  <label className="text-2xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-stone-500" />
                    Date d'embauche *
                  </label>
                  {isHireDateValid && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                </div>
                <input
                  type="date"
                  required
                  value={hireDate}
                  onChange={(e) => {
                    setHireDate(e.target.value);
                    if (errors.hireDate) {
                      setErrors(prev => { const n = { ...prev }; delete n.hireDate; return n; });
                    }
                  }}
                  className={`w-full px-3 py-2 rounded-xl border bg-stone-50 text-stone-900 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all ${
                    errors.hireDate ? 'border-red-500 ring-2 ring-red-200 bg-red-50/30' : 'border-stone-200'
                  }`}
                />
                {errors.hireDate && <p className="text-2xs text-red-600 font-medium mt-1">{errors.hireDate}</p>}
              </div>

              {/* Type de Contrat & Cycle de Congés */}
              <div>
                <label className="block text-2xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Cycle de Congés & Droits *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex flex-col p-3 rounded-2xl border cursor-pointer text-xs transition-all ${
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
                    <span className="text-[10px] font-normal text-stone-500 leading-relaxed">
                      • 30j après 5 mois de travail<br />
                      • 6e mois : 30j de congés<br />
                      • ~0.1967 j/j travaillé (6 j/m)
                    </span>
                  </label>

                  <label
                    className={`flex flex-col p-3 rounded-2xl border cursor-pointer text-xs transition-all ${
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
                    <span className="text-[10px] font-normal text-stone-500 leading-relaxed">
                      • 30j après 11 mois de travail<br />
                      • 12e mois : 30j de congés<br />
                      • ~0.0896 j/j travaillé (~2.73 j/m)
                    </span>
                  </label>
                </div>
              </div>

              {/* Status Validation Progress */}
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 flex items-center justify-between text-2xs">
                <span className="text-stone-500 font-medium">Validation des champs :</span>
                <span className={`font-bold flex items-center gap-1 ${isFormFullyValid ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {isFormFullyValid ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Tous les champs requis sont remplis (4/4)
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      {4 - validFieldsCount} information(s) requise(s) restante(s)
                    </>
                  )}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={handleRequestCloseForm}
                  className="px-4 py-2.5 text-xs font-semibold text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer active:scale-98 flex items-center gap-2"
                >
                  <Check className="w-4 h-4 text-amber-400" />
                  <span>{editingEmployee ? 'Enregistrer les modifications' : 'Créer l\'employé'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Save / Edit Confirmation Modal */}
      <ConfirmModal
        isOpen={showSaveConfirmModal}
        title={editingEmployee ? "Enregistrer les modifications de l'employé ?" : "Confirmer la création de l'employé ?"}
        subtitle={
          editingEmployee
            ? "Voulez-vous enregistrer les modifications apportées à la fiche de cet employé dans Cloud Firestore ?"
            : "Veuillez vérifier les informations ci-dessous avant d'enregistrer le nouvel employé dans la base de données."
        }
        type="save"
        confirmLabel={editingEmployee ? "Confirmer la mise à jour" : "Confirmer la création"}
        cancelLabel="Continuer la modification"
        summaryItems={[
          { label: "N° Matricule", value: idNumber, icon: <Hash className="w-3.5 h-3.5 text-stone-400" /> },
          { label: "Nom & Prénom", value: name, icon: <Users className="w-3.5 h-3.5 text-stone-400" /> },
          { label: "Poste / Fonction", value: position, icon: <Briefcase className="w-3.5 h-3.5 text-stone-400" /> },
          { label: "Statut Contractuel", value: status === 'EXPAT' ? 'Expatrié (EXPAT)' : 'Personnel Local (LOCAL)', icon: <Building2 className="w-3.5 h-3.5 text-stone-400" /> },
          { label: "Date d'Embauche", value: new Date(hireDate).toLocaleDateString('fr-FR'), icon: <Calendar className="w-3.5 h-3.5 text-stone-400" /> },
          { label: "Cycle de Congés", value: contractType === 'TYPE_A' ? 'Type A (30j acquis / 5 mois travail)' : 'Type B (30j acquis / 11 mois travail)', icon: <BadgeCheck className="w-3.5 h-3.5 text-stone-400" /> }
        ]}
        onConfirm={handleExecuteSave}
        onCancel={() => setShowSaveConfirmModal(false)}
      />

      {/* Cancel / Discard Unsaved Changes Confirmation Modal */}
      <ConfirmModal
        isOpen={showCancelConfirmModal}
        title="Modifications non enregistrées"
        subtitle="Vous avez des informations saisies ou modifiées dans le formulaire."
        type="warning"
        confirmLabel="Quitter sans enregistrer"
        cancelLabel="Continuer la saisie"
        warningMessage="Toutes les modifications apportées depuis l'ouverture du formulaire seront perdues si vous quittez maintenant."
        onConfirm={() => {
          setShowCancelConfirmModal(false);
          setIsFormOpen(false);
          setIsSubmittedAttempt(false);
          setEditingEmployee(null);
        }}
        onCancel={() => setShowCancelConfirmModal(false)}
      />

      {/* Delete Employee Confirmation Modal */}
      {employeeToDelete && (
        <ConfirmModal
          isOpen={Boolean(employeeToDelete)}
          title={`Supprimer définitivement ${employeeToDelete.name} ?`}
          subtitle={`Cette action supprimera également tout l'historique des congés associés à cet employé.`}
          type="danger"
          confirmLabel="Oui, supprimer définitivement"
          cancelLabel="Annuler"
          warningMessage="Attention : Cette suppression sera répercutée immédiatement dans Cloud Firestore et tous les appareils connectés."
          summaryItems={[
            { label: "N° Matricule", value: employeeToDelete.idNumber || 'SANS-MAT' },
            { label: "Nom & Prénom", value: employeeToDelete.name },
            { label: "Poste", value: employeeToDelete.position || 'Collaborateur' },
            { label: "Statut", value: employeeToDelete.status }
          ]}
          onConfirm={() => {
            const id = employeeToDelete.id;
            setEmployeeToDelete(null);
            onDeleteEmployee(id);
          }}
          onCancel={() => setEmployeeToDelete(null)}
        />
      )}

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs transition-all ${
            toastMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}
        >
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-stone-400 hover:text-stone-700 ml-2 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-4">
        {/* Header de la recherche multi-critères */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <Search className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                Recherche d'Employés
              </h3>
              <p className="text-[11px] text-stone-500">
                Filtrez instantanément par <strong>Nom</strong>, <strong>Prénom</strong> et <strong>Matricule</strong> (RH ou GL).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-medium text-stone-600 bg-stone-100 px-2.5 py-1 rounded-lg">
              <strong className="text-stone-900 font-bold">{filteredEmployees.length}</strong> / {employees.length} collaborateur(s)
            </span>
            {hasActiveSearch && (
              <button
                type="button"
                onClick={handleClearAllSearches}
                className="text-xs font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-100 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-stone-200"
                title="Effacer tous les critères de recherche"
              >
                <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
                <span>Effacer</span>
              </button>
            )}
          </div>
        </div>

        {/* Champs de recherche dédiés : Nom, Prénom, Matricule, et Poste/Mots-clés */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Recherche par Nom */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-stone-700 flex items-center gap-1 uppercase tracking-wider">
              <User className="w-3 h-3 text-amber-600" />
              Nom de famille
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="ex: ABADAME, ALAMI..."
                value={searchNom}
                onChange={(e) => setSearchNom(e.target.value)}
                className="w-full pl-3 pr-7 py-2 rounded-xl border border-stone-200 text-xs bg-stone-50 text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium"
              />
              {searchNom && (
                <button
                  type="button"
                  onClick={() => setSearchNom('')}
                  className="absolute right-2 top-2 text-stone-400 hover:text-stone-700 p-0.5 cursor-pointer"
                  title="Effacer le nom"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 2. Recherche par Prénom */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-stone-700 flex items-center gap-1 uppercase tracking-wider">
              <UserCheck className="w-3 h-3 text-teal-600" />
              Prénom
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="ex: PAUL, Karim, Marie..."
                value={searchPrenom}
                onChange={(e) => setSearchPrenom(e.target.value)}
                className="w-full pl-3 pr-7 py-2 rounded-xl border border-stone-200 text-xs bg-stone-50 text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
              />
              {searchPrenom && (
                <button
                  type="button"
                  onClick={() => setSearchPrenom('')}
                  className="absolute right-2 top-2 text-stone-400 hover:text-stone-700 p-0.5 cursor-pointer"
                  title="Effacer le prénom"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 3. Recherche par Matricule */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-stone-700 flex items-center gap-1 uppercase tracking-wider">
              <Hash className="w-3 h-3 text-indigo-600" />
              Matricule RH / GL
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="ex: P422766, MAT-0001, GL-001..."
                value={searchMatricule}
                onChange={(e) => setSearchMatricule(e.target.value)}
                className="w-full pl-3 pr-7 py-2 rounded-xl border border-stone-200 text-xs bg-stone-50 text-stone-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
              />
              {searchMatricule && (
                <button
                  type="button"
                  onClick={() => setSearchMatricule('')}
                  className="absolute right-2 top-2 text-stone-400 hover:text-stone-700 p-0.5 cursor-pointer"
                  title="Effacer le matricule"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 4. Recherche libre / Poste */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-stone-700 flex items-center gap-1 uppercase tracking-wider">
              <Briefcase className="w-3 h-3 text-stone-500" />
              Poste / Mots-clés
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="ex: Chauffeur, Gardien, Ingénieur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-3 pr-7 py-2 rounded-xl border border-stone-200 text-xs bg-stone-50 text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all font-medium"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-2 text-stone-400 hover:text-stone-700 p-0.5 cursor-pointer"
                  title="Effacer les mots-clés"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Badges des filtres actifs */}
        {hasActiveSearch && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1 text-2xs">
            <span className="text-stone-400 font-bold uppercase tracking-wider">Filtres de recherche actifs :</span>
            {searchNom && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 font-medium">
                <User className="w-3 h-3 text-amber-700" />
                <span>Nom : <strong>{searchNom}</strong></span>
                <button type="button" onClick={() => setSearchNom('')} className="hover:text-amber-950 ml-0.5 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {searchPrenom && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-900 border border-teal-200 font-medium">
                <UserCheck className="w-3 h-3 text-teal-700" />
                <span>Prénom : <strong>{searchPrenom}</strong></span>
                <button type="button" onClick={() => setSearchPrenom('')} className="hover:text-teal-950 ml-0.5 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {searchMatricule && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-900 border border-indigo-200 font-medium">
                <Hash className="w-3 h-3 text-indigo-700" />
                <span>Matricule : <strong>{searchMatricule}</strong></span>
                <button type="button" onClick={() => setSearchMatricule('')} className="hover:text-indigo-950 ml-0.5 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 text-stone-800 border border-stone-200 font-medium">
                <Briefcase className="w-3 h-3 text-stone-600" />
                <span>Poste/Mots-clés : <strong>{searchTerm}</strong></span>
                <button type="button" onClick={() => setSearchTerm('')} className="hover:text-stone-950 ml-0.5 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Ligne des Filtres Statut, Contrat */}
        <div className="pt-2.5 border-t border-stone-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
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

          {/* Compliance Filter Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-stone-100 w-full">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-stone-500" /> Dossier RH:
            </span>
            <button
              onClick={() => setComplianceFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                complianceFilter === 'ALL'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Tous ({employees.length})
            </button>
            <button
              onClick={() => setComplianceFilter('EN_REGLE')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                complianceFilter === 'EN_REGLE'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              En Règle ({countEnRegle})
            </button>
            <button
              onClick={() => setComplianceFilter('A_REGULARISER')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                complianceFilter === 'A_REGULARISER'
                  ? 'bg-red-700 text-white shadow-2xs'
                  : 'bg-red-50 text-red-800 border border-red-200 hover:bg-red-100'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              À Régulariser ({countARegulariser})
            </button>
            <button
              onClick={() => setComplianceFilter('A_RENOUVELER')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                complianceFilter === 'A_RENOUVELER'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              À Renouveler ({countARenouveler})
            </button>
            <button
              onClick={() => setComplianceFilter('A_COMPLETER_VERIFIER')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                complianceFilter === 'A_COMPLETER_VERIFIER'
                  ? 'bg-indigo-700 text-white shadow-2xs'
                  : 'bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              À Compléter ({countACompleter})
            </button>
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
              {employees.length === 0 
                ? "Aucun employé enregistré pour le moment" 
                : hasActiveSearch 
                  ? "Aucun collaborateur ne correspond à vos critères de recherche" 
                  : "Aucun employé ne correspond aux filtres"}
            </h3>
            <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
              {employees.length === 0 
                ? "Commencez par ajouter votre premier collaborateur ou importez directement une liste complète depuis un fichier Excel / CSV." 
                : hasActiveSearch
                  ? "Vérifiez l'orthographe du nom, prénom ou matricule saisi, ou réinitialisez la recherche."
                  : "Essayez de modifier votre recherche ou vos filtres de statut."}
            </p>
          </div>

          {hasActiveSearch && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleClearAllSearches}
                className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>Réinitialiser les critères de recherche</span>
              </button>
            </div>
          )}

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
                className="bg-white rounded-2xl border border-stone-200/80 shadow-xs hover:border-amber-300 hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  {/* Top Card Info (clickable to view employee page) */}
                  <div 
                    onClick={() => setSelectedEmployeeDetailId(emp.id)}
                    className="flex items-start justify-between gap-2 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-2xs transition-transform group-hover:scale-105 ${
                          emp.status === 'EXPAT' ? 'bg-purple-900' : 'bg-stone-900'
                        }`}>
                          {emp.name.charAt(0)}
                        </div>
                        {stats.isDebt && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-600 border-2 border-white ring-2 ring-red-400/50" title="Solde négatif à régulariser" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-stone-900 text-base hover:text-amber-700 transition-colors truncate">
                            {emp.name}
                          </h3>
                        </div>
                        <p className="text-xs font-medium text-stone-600 truncate">{emp.position || 'Collaborateur'}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="font-mono text-2xs font-bold px-1.5 py-0.2 rounded bg-stone-100 text-stone-700 border border-stone-200">
                            {emp.idNumber || 'SANS-MAT'}
                          </span>
                          {emp.matriculeGL && (
                            <span className="font-mono text-2xs font-bold px-1.5 py-0.2 rounded bg-stone-100 text-stone-700 border border-stone-200">
                              {emp.matriculeGL}
                            </span>
                          )}
                          {emp.nationality && (
                            <span className="text-2xs font-bold px-1.5 py-0.2 rounded bg-stone-100 text-stone-700 border border-stone-200 inline-flex items-center gap-0.5">
                              <Globe className="w-2.5 h-2.5" />
                              {emp.nationality}
                            </span>
                          )}
                          <span className="text-[11px] text-stone-400 whitespace-nowrap">• Embauché le {new Date(emp.hireDate).toLocaleDateString('fr-FR')}</span>
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

                  {/* HR Compliance & Documents Pill Bar */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    {/* Overall Compliance */}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-2xs font-bold border ${
                      (emp.overallState || 'EN_REGLE') === 'EN_REGLE' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                      emp.overallState === 'A_REGULARISER' ? 'bg-red-50 text-red-800 border-red-200' :
                      emp.overallState === 'A_RENOUVELER' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                      'bg-indigo-50 text-indigo-800 border-indigo-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        (emp.overallState || 'EN_REGLE') === 'EN_REGLE' ? 'bg-emerald-500' :
                        emp.overallState === 'A_REGULARISER' ? 'bg-red-500' :
                        emp.overallState === 'A_RENOUVELER' ? 'bg-amber-500' :
                        'bg-indigo-500'
                      }`} />
                      {(emp.overallState || 'EN_REGLE') === 'EN_REGLE' ? 'Dossier en règle' :
                       emp.overallState === 'A_REGULARISER' ? 'À régulariser' :
                       emp.overallState === 'A_RENOUVELER' ? 'À renouveler' :
                       'À compléter'}
                    </span>

                    {/* Documents Count */}
                    <button
                      onClick={() => setSelectedEmployeeDetailId(emp.id)}
                      className="inline-flex items-center gap-1 text-2xs text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer font-medium"
                    >
                      <FileText className="w-3 h-3 text-stone-500" />
                      <span>{emp.documents?.length || 0} doc(s)</span>
                    </button>
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold rounded-lg text-xs transition-all shadow-2xs cursor-pointer active:scale-98"
                      title="Ouvrir la page individuelle et les documents RH"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Fiche & Docs
                    </button>
                    <button
                      onClick={() => handleOpenEditForm(emp)}
                      className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg cursor-pointer transition-colors"
                      title="Modifier les données de cet employé"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {canDelete ? (
                      <button
                        onClick={() => setEmployeeToDelete(emp)}
                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                        title="Supprimer cet employé"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <span 
                        className="p-1.5 text-stone-300 cursor-not-allowed" 
                        title="Seul un Administrateur peut supprimer un collaborateur"
                      >
                        <Trash2 className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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
