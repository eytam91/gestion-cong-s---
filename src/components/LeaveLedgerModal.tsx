import React, { useState, useEffect } from 'react';
import { 
  X, 
  AlertTriangle, 
  PlusCircle,
  Banknote,
  CheckCircle2,
  HelpCircle,
  Globe,
  Building2,
  Calendar,
  Clock,
  FileText,
  AlertCircle
} from 'lucide-react';
import { Employee, LeaveRecord, LeaveType } from '../types';
import { calculateEmployeeStats, LEAVE_TYPE_LABELS } from '../utils/vacationCalc';
import { ConfirmModal } from './ConfirmModal';

interface LeaveLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  leaveRecords: LeaveRecord[];
  initialEmployeeId?: string;
  onAddLeaveRecord: (record: Omit<LeaveRecord, 'id' | 'createdAt'>) => void;
}

export const LeaveLedgerModal: React.FC<LeaveLedgerModalProps> = ({
  isOpen,
  onClose,
  employees,
  leaveRecords,
  initialEmployeeId,
  onAddLeaveRecord,
}) => {
  const [employeeId, setEmployeeId] = useState<string>(initialEmployeeId || (employees[0]?.id || ''));
  const [leaveType, setLeaveType] = useState<LeaveType>('CONGE_PAYE');
  const [isPaid, setIsPaid] = useState<boolean>(true);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [daysCount, setDaysCount] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');
  
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmittedAttempt, setIsSubmittedAttempt] = useState(false);

  // Confirmation Modals State
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);

  useEffect(() => {
    if (initialEmployeeId) {
      setEmployeeId(initialEmployeeId);
    } else if (employees.length > 0 && !employeeId) {
      setEmployeeId(employees[0].id);
    }
  }, [initialEmployeeId, employees]);

  // Recalculate days count automatically when dates change
  useEffect(() => {
    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
        if (e >= s) {
          const diffTime = Math.abs(e.getTime() - s.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          setDaysCount(diffDays);
          if (errors.endDate) {
            setErrors(prev => { const n = { ...prev }; delete n.endDate; return n; });
          }
        } else {
          setErrors(prev => ({
            ...prev,
            endDate: 'La date de fin ne peut pas être antérieure à la date de début.'
          }));
        }
      }
    }
  }, [startDate, endDate]);

  if (!isOpen) return null;

  const isFormDirty = (): boolean => {
    return Boolean(
      notes.trim() || 
      daysCount !== 1 || 
      leaveType !== 'CONGE_PAYE' || 
      !isPaid ||
      startDate !== new Date().toISOString().split('T')[0] ||
      endDate !== new Date().toISOString().split('T')[0]
    );
  };

  const handleRequestClose = () => {
    if (isFormDirty()) {
      setShowCancelConfirmModal(true);
    } else {
      onClose();
    }
  };

  const selectedEmployee = employees.find((e) => e.id === employeeId);
  const stats = selectedEmployee ? calculateEmployeeStats(selectedEmployee, leaveRecords) : null;

  // Projection of new balance
  let projectedBalance = stats ? stats.balanceDays : 0;
  if (stats && isPaid) {
    if (leaveType === 'CONGE_PAYE') {
      projectedBalance = stats.balanceDays - daysCount;
    } else if (leaveType === 'RECUPERATION_JOURS') {
      projectedBalance = stats.balanceDays + daysCount;
    }
  }

  const validateForm = (): boolean => {
    const errs: { [key: string]: string } = {};

    // 1. Employé sélectionné
    if (!employeeId || !employees.some(e => e.id === employeeId)) {
      errs.employeeId = 'Veuillez sélectionner un collaborateur valide.';
    }

    // 2. Dates
    if (!startDate) {
      errs.startDate = 'La date de début est obligatoire.';
    } else if (isNaN(new Date(startDate).getTime())) {
      errs.startDate = 'Date de début invalide.';
    }

    if (!endDate) {
      errs.endDate = 'La date de fin est obligatoire.';
    } else if (isNaN(new Date(endDate).getTime())) {
      errs.endDate = 'Date de fin invalide.';
    } else if (startDate && new Date(endDate) < new Date(startDate)) {
      errs.endDate = 'La date de fin ne peut pas être antérieure à la date de début.';
    }

    // 3. Nombre de jours
    if (daysCount === undefined || daysCount === null || isNaN(daysCount)) {
      errs.daysCount = 'Le nombre de jours est obligatoire.';
    } else if (daysCount <= 0) {
      errs.daysCount = 'Le nombre de jours doit être supérieur à 0 (minimum 0.5 jour).';
    } else if (daysCount > 365) {
      errs.daysCount = 'Le nombre de jours ne peut pas dépasser 365 jours pour une seule saisie.';
    }

    // 4. Catégorie & Notes
    if (!leaveType) {
      errs.leaveType = 'Veuillez sélectionner la catégorie de congé.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittedAttempt(true);
    if (!validateForm()) {
      return;
    }
    // Form is strictly valid -> Open confirmation popup
    setShowSaveConfirmModal(true);
  };

  const handleExecuteSave = () => {
    setShowSaveConfirmModal(false);

    onAddLeaveRecord({
      employeeId,
      startDate,
      endDate,
      daysCount: Number(daysCount),
      leaveType,
      isPaid,
      notes: notes.trim(),
    });

    setIsSubmittedAttempt(false);
    onClose();
  };

  const isEmployeeValid = Boolean(employeeId && employees.some(e => e.id === employeeId));
  const isDateRangeValid = Boolean(startDate && endDate && new Date(endDate) >= new Date(startDate));
  const isDaysCountValid = Boolean(daysCount > 0 && daysCount <= 365 && !isNaN(daysCount));
  const isFormFullyValid = isEmployeeValid && isDateRangeValid && isDaysCountValid;

  return (
    <>
      <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-stone-900 text-white flex items-center justify-center shadow-xs">
                <PlusCircle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-900">Saisie d'un Congé ou d'une Absence</h3>
                <p className="text-2xs text-stone-500">Enregistrement avec calcul automatique et vérification logique stricte</p>
              </div>
            </div>
            <button
              onClick={handleRequestClose}
              className="text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-100 transition-colors cursor-pointer"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Error Banner if validation fails */}
          {isSubmittedAttempt && Object.keys(errors).length > 0 && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Impossible d'enregistrer : Veuillez corriger les erreurs suivantes :</p>
                <ul className="list-disc pl-4 mt-1 space-y-0.5 text-2xs">
                  {Object.values(errors).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <form onSubmit={handlePreSubmit} className="space-y-4">
            {/* Sélection Employé */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-2xs font-bold text-stone-700 uppercase tracking-wider">
                  Collaborateur concerné *
                </label>
                {isEmployeeValid && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
              </div>
              <select
                value={employeeId}
                onChange={(e) => {
                  setEmployeeId(e.target.value);
                  if (errors.employeeId) {
                    setErrors(prev => { const n = { ...prev }; delete n.employeeId; return n; });
                  }
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl border bg-stone-50 text-stone-900 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 font-semibold transition-all ${
                  errors.employeeId ? 'border-red-500 ring-2 ring-red-200 bg-red-50/30' : 'border-stone-200'
                }`}
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    [{emp.idNumber || 'SANS-MAT'}] {emp.name} — {emp.position || 'Collaborateur'} ({emp.status === 'EXPAT' ? 'Expatrié' : 'Personnel Local'} • {emp.contractType === 'TYPE_A' ? 'Type A 6m' : 'Type B 12m'})
                  </option>
                ))}
              </select>
              {errors.employeeId && <p className="text-2xs text-red-600 font-medium mt-1">{errors.employeeId}</p>}
            </div>

            {/* Statut de Rémunération (Payé / Non Payé) */}
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-2">
              <label className="block text-2xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-amber-600" />
                Rémunération du Congé *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaid(true)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    isPaid
                      ? 'bg-emerald-700 text-white shadow-2xs border border-emerald-800'
                      : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Congé Payé (Rémunéré)
                </button>

                <button
                  type="button"
                  onClick={() => setIsPaid(false)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    !isPaid
                      ? 'bg-amber-800 text-white shadow-2xs border border-amber-900'
                      : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  Congé Sans Solde (Non payé)
                </button>
              </div>
              <p className="text-2xs text-stone-500 leading-relaxed">
                {isPaid 
                  ? '✓ Ce congé est rémunéré et sera déduit du solde de congés acquis.' 
                  : '⚠ Ce congé est non rémunéré (sans solde). Il est consigné mais NE DÉDUIT PAS le solde de congés payés.'}
              </p>
            </div>

            {/* Catégorie de Congé */}
            <div>
              <label className="block text-2xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Catégorie de la demande *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(LEAVE_TYPE_LABELS) as LeaveType[]).map((typeKey) => (
                  <button
                    type="button"
                    key={typeKey}
                    onClick={() => setLeaveType(typeKey)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                      leaveType === typeKey
                        ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {LEAVE_TYPE_LABELS[typeKey]}
                  </button>
                ))}
              </div>
            </div>

            {/* Dates & Jours */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-2xs font-bold text-stone-700 uppercase tracking-wider">
                    Date de début *
                  </label>
                  {startDate && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                </div>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (errors.startDate) {
                      setErrors(prev => { const n = { ...prev }; delete n.startDate; return n; });
                    }
                  }}
                  className={`w-full px-3 py-2 rounded-xl border bg-stone-50 text-stone-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 ${
                    errors.startDate ? 'border-red-500 ring-2 ring-red-200' : 'border-stone-200'
                  }`}
                />
                {errors.startDate && <p className="text-2xs text-red-600 font-medium mt-1">{errors.startDate}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-2xs font-bold text-stone-700 uppercase tracking-wider">
                    Date de fin *
                  </label>
                  {isDateRangeValid && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                </div>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    if (errors.endDate) {
                      setErrors(prev => { const n = { ...prev }; delete n.endDate; return n; });
                    }
                  }}
                  className={`w-full px-3 py-2 rounded-xl border bg-stone-50 text-stone-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 ${
                    errors.endDate ? 'border-red-500 ring-2 ring-red-200 bg-red-50/40' : 'border-stone-200'
                  }`}
                />
                {errors.endDate && <p className="text-2xs text-red-600 font-bold mt-1 leading-tight">{errors.endDate}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-2xs font-bold text-stone-700 uppercase tracking-wider">
                    Nombre de Jours *
                  </label>
                  {isDaysCountValid && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                </div>
                <input
                  type="number"
                  required
                  min="0.5"
                  max="365"
                  step="0.5"
                  value={daysCount}
                  onChange={(e) => {
                    setDaysCount(Number(e.target.value));
                    if (errors.daysCount) {
                      setErrors(prev => { const n = { ...prev }; delete n.daysCount; return n; });
                    }
                  }}
                  className={`w-full px-3 py-2 rounded-xl border bg-stone-50 text-stone-900 text-xs font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 ${
                    errors.daysCount ? 'border-red-500 ring-2 ring-red-200 bg-red-50/40' : 'border-stone-200'
                  }`}
                />
                {errors.daysCount && <p className="text-2xs text-red-600 font-medium mt-1">{errors.daysCount}</p>}
              </div>
            </div>

            {/* Real-time Projected Balance Preview */}
            {stats && selectedEmployee && (
              <div className="p-4 rounded-2xl border border-stone-200 text-xs space-y-2 bg-stone-50 text-stone-800">
                <div className="flex justify-between items-center font-semibold">
                  <span>Solde de congés actuel avant cette saisie:</span>
                  <span className="font-mono font-bold text-stone-900">
                    {stats.balanceDays >= 0 ? `+${stats.balanceDays.toFixed(1)} j` : `${stats.balanceDays.toFixed(1)} j`}
                  </span>
                </div>

                {isPaid && (leaveType === 'CONGE_PAYE' || leaveType === 'RECUPERATION_JOURS') && (
                  <>
                    <div className="flex justify-between items-center font-bold pt-1.5 border-t border-stone-200/80">
                      <span>Nouveau Solde Projeté :</span>
                      <span className={`font-mono text-sm ${projectedBalance < 0 ? 'text-red-600 font-extrabold' : 'text-emerald-700 font-extrabold'}`}>
                        {projectedBalance >= 0 ? `+${projectedBalance.toFixed(1)} j` : `${projectedBalance.toFixed(1)} j (Négatif)`}
                      </span>
                    </div>

                    {projectedBalance < 0 && (
                      <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-2xs space-y-1 font-medium">
                        <p className="font-bold text-red-700 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          ⚠️ Attention : Dépassement des Jours Acquis !
                        </p>
                        <p>
                          L'employé aura consommé <strong>{Math.abs(projectedBalance).toFixed(1)} jours</strong> au-delà de ses droits acquis.
                        </p>
                      </div>
                    )}
                  </>
                )}

                {!isPaid && (
                  <div className="flex justify-between items-center text-amber-900 font-semibold pt-1 border-t border-stone-200/60">
                    <span>Impact sur le solde de congés payés:</span>
                    <span className="font-mono text-amber-800 font-bold">0 jour (Non déduit)</span>
                  </div>
                )}
              </div>
            )}

            {/* Notes / Remarques */}
            <div>
              <label className="block text-2xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Remarques / Motif d'approbation (Optionnel)
              </label>
              <input
                type="text"
                placeholder="ex: Accordé par la direction pour convenance personnelle"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10"
              />
            </div>

            {/* Validation Badge */}
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 flex items-center justify-between text-2xs">
              <span className="text-stone-500 font-medium">Vérification de la saisie :</span>
              <span className={`font-bold flex items-center gap-1 ${isFormFullyValid ? 'text-emerald-700' : 'text-amber-700'}`}>
                {isFormFullyValid ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Toutes les informations requises sont valides
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Veuillez renseigner toutes les informations logiques requises
                  </>
                )}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={handleRequestClose}
                className="px-4 py-2.5 text-xs font-semibold text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer active:scale-98 flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4 text-amber-400" />
                <span>Enregistrer au Journal</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Save Confirmation Modal */}
      {selectedEmployee && (
        <ConfirmModal
          isOpen={showSaveConfirmModal}
          title="Confirmer la saisie de ce congé ?"
          subtitle="Vérifiez les détails de cette absence avant de l'enregistrer dans Cloud Firestore."
          type="save"
          confirmLabel="Confirmer et Enregistrer au Journal"
          cancelLabel="Continuer la modification"
          summaryItems={[
            { 
              label: "Collaborateur", 
              value: `[${selectedEmployee.idNumber || 'SANS-MAT'}] ${selectedEmployee.name}`,
              icon: <Building2 className="w-3.5 h-3.5 text-stone-400" />
            },
            { 
              label: "Catégorie d'Absence", 
              value: LEAVE_TYPE_LABELS[leaveType],
              icon: <FileText className="w-3.5 h-3.5 text-stone-400" />
            },
            { 
              label: "Période", 
              value: `Du ${new Date(startDate).toLocaleDateString('fr-FR')} au ${new Date(endDate).toLocaleDateString('fr-FR')}`,
              icon: <Calendar className="w-3.5 h-3.5 text-stone-400" />
            },
            { 
              label: "Nombre de Jours", 
              value: `${daysCount} jour(s)`,
              icon: <Clock className="w-3.5 h-3.5 text-stone-400" />
            },
            { 
              label: "Rémunération", 
              value: isPaid ? "Congé Payé (Déduit du solde)" : "Sans Solde (Non déduit)",
              icon: <Banknote className="w-3.5 h-3.5 text-stone-400" />
            },
            { 
              label: "Solde Projeté", 
              value: isPaid 
                ? (projectedBalance >= 0 ? `+${projectedBalance.toFixed(1)} j` : `${projectedBalance.toFixed(1)} j (Négatif)`)
                : `${stats?.balanceDays.toFixed(1)} j (Inchangé)`
            }
          ]}
          warningMessage={
            projectedBalance < 0 && isPaid
              ? `Attention : Cet enregistrement placera le solde de cet employé en négatif (${projectedBalance.toFixed(1)} jours).`
              : undefined
          }
          onConfirm={handleExecuteSave}
          onCancel={() => setShowSaveConfirmModal(false)}
        />
      )}

      {/* Discard Unsaved Changes Modal */}
      <ConfirmModal
        isOpen={showCancelConfirmModal}
        title="Abandonner la saisie du congé ?"
        subtitle="Vous avez commencé à remplir les informations de ce congé."
        type="warning"
        confirmLabel="Quitter sans enregistrer"
        cancelLabel="Continuer la saisie"
        warningMessage="Les dates et paramètres saisis ne seront pas enregistrés."
        onConfirm={() => {
          setShowCancelConfirmModal(false);
          onClose();
        }}
        onCancel={() => setShowCancelConfirmModal(false)}
      />
    </>
  );
};
