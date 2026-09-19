import React from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  Edit3,
  Globe,
  History,
  Plus,
  Trash2,
} from 'lucide-react';
import { Employee, EmployeeStats } from '@/types';

interface EmployeeCardProps {
  employee: Employee;
  stats: EmployeeStats;
  canDelete: boolean;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
  onShowHistory: (employeeId: string) => void;
  onAddLeave: (employeeId: string) => void;
}

export const EmployeeCard: React.FC<EmployeeCardProps> = ({
  employee,
  stats,
  canDelete,
  onEdit,
  onDelete,
  onShowHistory,
  onAddLeave,
}) => (
  <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs hover:border-stone-300 transition-all p-5 flex flex-col justify-between space-y-4">
    <div className="space-y-3">
      {/* Top Card Info */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-2xs ${
                employee.status === 'EXPAT' ? 'bg-purple-900' : 'bg-stone-900'
              }`}
            >
              {employee.name.charAt(0)}
            </div>
            {stats.isDebt && (
              <span
                className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-600 border-2 border-white ring-2 ring-red-400/50"
                title="Solde négatif à régulariser"
              />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-stone-900 text-base">{employee.name}</h3>
            </div>
            <p className="text-xs font-medium text-stone-600">
              {employee.position || 'Collaborateur'}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="font-mono text-2xs font-bold px-1.5 py-0.2 rounded bg-stone-100 text-stone-700 border border-stone-200">
                {employee.idNumber || 'SANS-MAT'}
              </span>
              {employee.matriculeGL && (
                <span className="font-mono text-2xs font-bold px-1.5 py-0.2 rounded bg-stone-100 text-stone-700 border border-stone-200">
                  {employee.matriculeGL}
                </span>
              )}
              {employee.nationality && (
                <span className="text-2xs font-bold px-1.5 py-0.2 rounded bg-stone-100 text-stone-700 border border-stone-200 inline-flex items-center gap-0.5">
                  <Globe className="w-2.5 h-2.5" />
                  {employee.nationality}
                </span>
              )}
              <span className="text-[11px] text-stone-400 whitespace-nowrap">
                • Embauché le {new Date(employee.hireDate).toLocaleDateString('fr-FR')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          {/* Status Badge (LOCAL vs EXPAT) */}
          {employee.status === 'EXPAT' ? (
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
          {employee.contractType === 'TYPE_A' ? (
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
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />-
              {stats.debtDays.toFixed(1)} j (Négatif)
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
              <span>
                Doit régulariser <strong>{stats.debtDays.toFixed(1)} jour(s)</strong>
              </span>
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
        onClick={() => onAddLeave(employee.id)}
        className="inline-flex items-center gap-1 text-xs font-bold bg-stone-900 hover:bg-stone-800 text-white px-3 py-1.5 rounded-lg transition-all cursor-pointer active:scale-98"
      >
        <Plus className="w-3.5 h-3.5 text-amber-400" />
        Saisir Congé
      </button>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onShowHistory(employee.id)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold rounded-lg text-xs transition-all shadow-2xs cursor-pointer active:scale-98"
          title="Consulter l'historique détaillé des congés"
        >
          <History className="w-3.5 h-3.5" />
          Historique
        </button>
        <button
          onClick={() => onEdit(employee)}
          className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg cursor-pointer transition-colors"
          title="Modifier les données de cet employé"
        >
          <Edit3 className="w-4 h-4" />
        </button>
        {canDelete && (
          <button
            onClick={() => onDelete(employee)}
            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
            title="Supprimer cet employé"
            aria-label={`Supprimer ${employee.name}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  </div>
);
