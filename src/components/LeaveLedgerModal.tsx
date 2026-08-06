import React, { useState, useEffect } from 'react';
import { 
  X, 
  AlertTriangle, 
  PlusCircle,
  Banknote,
  CheckCircle2,
  HelpCircle,
  Globe,
  Building2
} from 'lucide-react';
import { Employee, LeaveRecord, LeaveType } from '../types';
import { calculateEmployeeStats, LEAVE_TYPE_LABELS } from '../utils/vacationCalc';

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialEmployeeId) {
      setEmployeeId(initialEmployeeId);
    } else if (employees.length > 0 && !employeeId) {
      setEmployeeId(employees[0].id);
    }
  }, [initialEmployeeId, employees]);

  // Calcul automatique du nombre de jours entre date de début et fin
  useEffect(() => {
    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (e >= s) {
        const diffTime = Math.abs(e.getTime() - s.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        setDaysCount(diffDays);
      }
    }
  }, [startDate, endDate]);

  if (!isOpen) return null;

  const selectedEmployee = employees.find((e) => e.id === employeeId);
  const stats = selectedEmployee ? calculateEmployeeStats(selectedEmployee, leaveRecords) : null;

  // Projection du nouveau solde selon le type de saisie et si c'est payé
  let projectedBalance = stats ? stats.balanceDays : 0;
  if (stats && isPaid) {
    if (leaveType === 'CONGE_PAYE') {
      projectedBalance = stats.balanceDays - daysCount;
    } else if (leaveType === 'RECUPERATION_JOURS') {
      projectedBalance = stats.balanceDays + daysCount;
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!employeeId) {
      setError('Veuillez sélectionner un employé.');
      return;
    }
    if (daysCount <= 0 || isNaN(daysCount)) {
      setError('Le nombre de jours doit être supérieur à 0.');
      return;
    }

    onAddLeaveRecord({
      employeeId,
      startDate,
      endDate,
      daysCount: Number(daysCount),
      leaveType,
      isPaid,
      notes: notes.trim(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-xl w-full p-6 space-y-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-stone-900 text-white flex items-center justify-center shadow-xs">
              <PlusCircle className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-900">Saisie d'un Congé (Passé ou Actuel)</h3>
              <p className="text-2xs text-stone-500">Enregistrez l'historique des congés antérieurs ou de nouvelles demandes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              {error}
            </div>
          )}

          {/* Sélection Employé */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Employé concerné
            </label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 font-medium transition-all"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  [{emp.idNumber || 'SANS-MAT'}] {emp.name} — {emp.position || 'Collaborateur'} ({emp.status === 'EXPAT' ? 'Expatrié' : 'Personnel Local'} • {emp.contractType === 'TYPE_A' ? 'Type A 6m' : 'Type B 12m'})
                </option>
              ))}
            </select>
          </div>

          {/* Statut de Rémunération (Payé / Non Payé) */}
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80 space-y-2">
            <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-amber-600" />
              Statut de Rémunération du Congé
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsPaid(true)}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  isPaid
                    ? 'bg-emerald-700 text-white shadow-2xs border border-emerald-800'
                    : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                Congé Payé (Rémunéré)
              </button>

              <button
                type="button"
                onClick={() => setIsPaid(false)}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  !isPaid
                    ? 'bg-amber-800 text-white shadow-2xs border border-amber-900'
                    : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                Congé Non Payé (Sans solde)
              </button>
            </div>
            <p className="text-2xs text-stone-500 leading-relaxed">
              {isPaid 
                ? '✓ Ce congé est rémunéré et sera déduit du solde de congés acquis de l\'employé.' 
                : '⚠ Ce congé est non rémunéré (sans solde). Il est consigné au registre mais NE DÉDUIT PAS le solde de congés payés.'}
            </p>
          </div>

          {/* Type d'Absence */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Catégorie de la demande
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
              <label className="block text-2xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Date de début
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10"
              />
            </div>

            <div>
              <label className="block text-2xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Date de fin
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10"
              />
            </div>

            <div>
              <label className="block text-2xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Nombre de Jours
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={daysCount}
                onChange={(e) => setDaysCount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 text-xs font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10"
              />
            </div>
          </div>

          {/* Real-time Balance Preview */}
          {stats && selectedEmployee && (
            <div className="p-4 rounded-xl border border-stone-200 text-xs space-y-2 bg-stone-50 text-stone-800">
              <div className="flex justify-between items-center font-semibold">
                <span>Solde de congés actuel avant cette saisie:</span>
                <span className="font-mono">{stats.balanceDays >= 0 ? `+${stats.balanceDays.toFixed(1)} j` : `${stats.balanceDays.toFixed(1)} j`}</span>
              </div>

              {isPaid && (leaveType === 'CONGE_PAYE' || leaveType === 'RECUPERATION_JOURS') && (
                <>
                  <div className="flex justify-between items-center font-bold pt-1 border-t border-stone-200/60">
                    <span>Projet de Solde (solde) après enregistrement:</span>
                    <span className={`font-mono text-sm ${projectedBalance < 0 ? 'text-red-600 font-bold' : 'text-emerald-700 font-bold'}`}>
                      {projectedBalance >= 0 ? `+${projectedBalance.toFixed(1)} j` : `${projectedBalance.toFixed(1)} j`}
                    </span>
                  </div>

                  {projectedBalance < 0 && (
                    <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-900 text-2xs space-y-1 font-medium">
                      <p className="font-bold text-red-700 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        ⚠️ Attention : Dépassement des Jours Acquis !
                      </p>
                      <p>
                        L'employé aura consommé <strong>{Math.abs(projectedBalance).toFixed(1)} jours</strong> au-delà des jours acquis par son travail.
                      </p>
                    </div>
                  )}
                </>
              )}

              {!isPaid && (
                <div className="flex justify-between items-center text-amber-900 font-semibold pt-1 border-t border-stone-200/60">
                  <span>Impact sur le solde de congés payés:</span>
                  <span className="font-mono text-amber-800">0 jour (Non déduit)</span>
                </div>
              )}
            </div>
          )}

          {/* Notes / Remarques */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
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

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Enregistrer au Journal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
