import React from 'react';
import { AlertTriangle, FileText, Plus, X } from 'lucide-react';
import { Employee, EmployeeStats, LeaveRecord } from '@/types';
import { LEAVE_TYPE_LABELS } from '@/features/leave/vacationCalc';

interface EmployeeDetailModalProps {
  employee: Employee;
  stats: EmployeeStats;
  records: LeaveRecord[];
  onClose: () => void;
  onAddLeave: (employeeId: string) => void;
}

export const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({
  employee,
  stats,
  records,
  onClose,
  onAddLeave,
}) => (
  <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-center justify-between border-b border-stone-100 pb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-2xl text-white font-bold text-base flex items-center justify-center ${
              employee.status === 'EXPAT' ? 'bg-purple-900' : 'bg-stone-900'
            }`}
          >
            {employee.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-stone-900">{employee.name}</h3>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-800 border border-stone-200">
                {employee.idNumber || 'SANS-MAT'}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              {employee.position} •{' '}
              {employee.status === 'EXPAT' ? 'Expatrié (EXPAT)' : 'Personnel Local (LOCAL)'} •
              Contrat {employee.contractType} (Embauché le{' '}
              {new Date(employee.hireDate).toLocaleDateString('fr-FR')})
            </p>
          </div>
        </div>
        <button
          onClick={() => onClose()}
          className="text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-100 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Solde & Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
          <p className="text-2xs font-bold text-stone-400 uppercase">Jours Acquis Total</p>
          <p className="text-lg font-bold text-emerald-700 mt-1 font-mono">
            +{stats.totalAccruedDays.toFixed(1)} j
          </p>
        </div>

        <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
          <p className="text-2xs font-bold text-stone-400 uppercase">Congés Payés Pris</p>
          <p className="text-lg font-bold text-stone-900 mt-1 font-mono">
            {stats.totalLeaveTakenDays} j
          </p>
        </div>

        <div
          className={`p-3.5 rounded-2xl border ${stats.isDebt ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}
        >
          <p className="text-2xs font-bold uppercase text-stone-500">Solde Actuel (Solde)</p>
          <p
            className={`text-lg font-bold mt-1 font-mono ${stats.isDebt ? 'text-red-700' : 'text-emerald-700'}`}
          >
            {stats.isDebt
              ? `-${stats.debtDays.toFixed(1)} j`
              : `+${stats.balanceDays.toFixed(1)} j`}
          </p>
        </div>
      </div>

      {/* Indication if employee passed allocated days */}
      {stats.isDebt && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl text-xs space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-red-900">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>
              Dépassement des Jours Acquis (+{stats.exceededDays.toFixed(1)} jours en avance)
            </span>
          </div>
          <p className="text-red-800 text-2xs leading-relaxed">
            L'employé a consommé {stats.totalLeaveTakenDays} jours de congé payé pour{' '}
            {stats.totalAccruedDays.toFixed(1)} jours accumulés par son travail. Il lui faudra
            environ <strong>~{stats.daysToPayback} jours de travail</strong> pour régulariser ce
            solde négatif.
          </p>
        </div>
      )}

      {/* Detail History List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-stone-600" />
            <span>Historique des Congés & Absences</span>
            <span className="text-2xs text-stone-400 font-normal">
              ({records.length} enregistrement(s))
            </span>
          </h4>
          <button
            onClick={() => {
              const empId = employee.id;
              onClose();
              onAddLeave(empId);
            }}
            className="inline-flex items-center gap-1 text-xs font-bold bg-amber-400 hover:bg-amber-300 text-stone-950 px-3 py-1.5 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-98"
          >
            <Plus className="w-3.5 h-3.5" />
            Saisir Congé
          </button>
        </div>

        {records.length === 0 ? (
          <p className="text-xs text-stone-400 italic py-4 text-center">
            Aucune absence enregistrée pour cet employé.
          </p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {records.map((rec) => (
              <div
                key={rec.id}
                className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs flex justify-between items-center"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900">
                      {LEAVE_TYPE_LABELS[rec.leaveType]}
                    </span>
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
                    Du {new Date(rec.startDate).toLocaleDateString('fr-FR')} au{' '}
                    {new Date(rec.endDate).toLocaleDateString('fr-FR')}{' '}
                    {rec.notes ? `• ${rec.notes}` : ''}
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
          onClick={() => onClose()}
          className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
        >
          Fermer
        </button>
      </div>
    </div>
  </div>
);
