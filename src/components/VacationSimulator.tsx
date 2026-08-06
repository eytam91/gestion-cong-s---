import React, { useState } from 'react';
import { Calculator, ArrowRight, AlertTriangle, CheckCircle2, Calendar, Clock, Sparkles } from 'lucide-react';
import { Employee, LeaveRecord } from '../types';
import { calculateEmployeeStats } from '../utils/vacationCalc';

interface VacationSimulatorProps {
  employees: Employee[];
  leaveRecords: LeaveRecord[];
  onOpenLeaveModal: (employeeId?: string) => void;
}

export const VacationSimulator: React.FC<VacationSimulatorProps> = ({
  employees,
  leaveRecords,
  onOpenLeaveModal,
}) => {
  const [selectedEmpId, setSelectedEmpId] = useState<string>(employees[0]?.id || '');
  const [simulatedDays, setSimulatedDays] = useState<number>(30); // Par défaut 30 jours comme demandé

  const selectedEmployee = employees.find((e) => e.id === selectedEmpId);
  const stats = selectedEmployee ? calculateEmployeeStats(selectedEmployee, leaveRecords) : null;

  if (!selectedEmployee || !stats) {
    return null;
  }

  // Solde initial avant demande
  const currentBalance = stats.balanceDays;
  // Solde projeté = Solde initial - Jours demandés
  const projectedBalance = currentBalance - simulatedDays;
  const isProjectedDebt = projectedBalance < 0;
  const projectedDebtDays = isProjectedDebt ? Math.abs(projectedBalance) : 0;

  // Calcul du temps de résorption du solde négatif projeté (en jours de travail)
  const projectedDaysToPayback = isProjectedDebt && stats.dailyAccrualRate > 0
    ? Math.ceil(projectedDebtDays / stats.dailyAccrualRate)
    : 0;

  return (
    <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
            <Calculator className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              Simulateur & Calculateur de Congés Pris par Avance
            </h3>
            <p className="text-xs text-stone-500">
              Calculez l'impact d'une demande de congé (ex: 30 jours) sur le solde actuel de l'employé (positif ou déjà négatif).
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-2xs font-bold bg-amber-50 text-amber-900 border border-amber-200 self-start sm:self-auto">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          Calcul sur le Solde Précédent
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Paramètres de Simulation */}
        <div className="space-y-4 bg-stone-50/70 p-4 rounded-xl border border-stone-200/60">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Sélectionner l'Employé
            </label>
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-stone-900/10"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  [{emp.idNumber || 'SANS-MAT'}] {emp.name} — {emp.position || 'Collaborateur'} ({emp.status === 'EXPAT' ? 'Expatrié' : 'Personnel Local'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Durée du Congé Demandé (en Jours)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="180"
                value={simulatedDays}
                onChange={(e) => setSimulatedDays(Math.max(1, Number(e.target.value)))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-stone-900/10"
              />
              <span className="text-xs font-bold text-stone-500 shrink-0">jours</span>
            </div>

            {/* Boutons Presets (7j, 15j, 30j, 45j, 60j) */}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {[7, 15, 30, 45, 60].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setSimulatedDays(days)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    simulatedDays === days
                      ? 'bg-stone-900 text-white shadow-2xs'
                      : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {days} Jours
                </button>
              ))}
            </div>
          </div>

          {/* Informations sur l'employé sélectionné */}
          <div className="pt-2 border-t border-stone-200/80 text-xs space-y-1.5 text-stone-600">
            <div className="flex justify-between">
              <span>Matricule :</span>
              <span className="font-mono font-bold text-stone-800">{selectedEmployee.idNumber || 'SANS-MAT'}</span>
            </div>
            <div className="flex justify-between">
              <span>Poste & Statut :</span>
              <span className="font-semibold text-stone-800">{selectedEmployee.position || 'Collaborateur'} ({selectedEmployee.status})</span>
            </div>
            <div className="flex justify-between">
              <span>Date d'embauche :</span>
              <span className="font-semibold text-stone-800">{new Date(selectedEmployee.hireDate).toLocaleDateString('fr-FR')}</span>
            </div>
            <div className="flex justify-between">
              <span>Acquisition quotidienne :</span>
              <span className="font-mono text-stone-800">+{stats.dailyAccrualRate.toFixed(4)} j/jour</span>
            </div>
          </div>
        </div>

        {/* Résultats du Calcul Projeté */}
        <div className="space-y-4 bg-gradient-to-br from-stone-900 to-stone-800 text-white p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between border-b border-stone-700/70 pb-3">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Résultat de la Simulation
            </span>
            <span className="text-2xs font-mono text-stone-400">
              [{selectedEmployee.idNumber}] {selectedEmployee.name}
            </span>
          </div>

          <div className="space-y-3">
            {/* Étape 1 : Solde Précédent */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-300">Solde de congés actuel :</span>
              <span className={`font-mono font-bold px-2 py-0.5 rounded ${
                currentBalance >= 0 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-red-950 text-red-300 border border-red-800'
              }`}>
                {currentBalance >= 0 ? `+${currentBalance.toFixed(1)} j` : `${currentBalance.toFixed(1)} j (Solde Négatif)`}
              </span>
            </div>

            {/* Étape 2 : Congé Demandé */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-300">Congé demandé :</span>
              <span className="font-mono font-bold text-amber-300">-{simulatedDays} jours</span>
            </div>

            <div className="h-px bg-stone-700/80 my-1"></div>

            {/* Étape 3 : Solde Projeté Calculé */}
            <div>
              <p className="text-2xs text-stone-400 uppercase font-semibold">Solde Projeté Après le Congé :</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-2xl font-black font-mono ${
                  projectedBalance >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {projectedBalance >= 0 ? `+${projectedBalance.toFixed(1)}` : projectedBalance.toFixed(1)} jours
                </span>
                <span className="text-xs font-semibold text-stone-300">
                  {isProjectedDebt ? `(L'employé aura un solde négatif de ${projectedDebtDays.toFixed(1)} j)` : '(Solde positif restant)'}
                </span>
              </div>
            </div>

            {/* Explications claires */}
            {isProjectedDebt ? (
              <div className="bg-stone-800/90 border border-stone-700 p-3 rounded-lg text-xs space-y-1.5 text-stone-200">
                <p className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Résorption par le travail : ~{projectedDaysToPayback} jours de travail
                </p>
                <p className="text-2xs text-stone-300 leading-relaxed">
                  L'employé devra effectuer <strong>{projectedDaysToPayback} jours de travail</strong> pour résorber ce solde négatif de {projectedDebtDays.toFixed(1)} jours par son activité quotidienne.
                </p>
              </div>
            ) : (
              <div className="bg-emerald-950/60 border border-emerald-800/70 p-3 rounded-lg text-xs text-emerald-200">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Solde de congés suffisant
                </p>
                <p className="text-2xs text-emerald-300 mt-0.5">
                  L'employé disposera toujours de +{projectedBalance.toFixed(1)} jours de congé disponibles après ces {simulatedDays} jours pris.
                </p>
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              onClick={() => onOpenLeaveModal(selectedEmployee.id)}
              className="w-full flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-bold py-2.5 px-4 rounded-xl transition-all shadow-xs cursor-pointer active:scale-98"
            >
              Enregistrer ce Congé au Journal
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
