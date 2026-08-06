import React, { useState } from 'react';
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  TrendingDown, 
  CheckCircle2, 
  Calendar, 
  Plus, 
  ShieldAlert,
  HeartPulse,
  Banknote,
  BarChart3,
  TrendingUp,
  Layers,
  Globe,
  Building2,
  Briefcase,
  Sparkles
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  Cell, 
  ReferenceLine 
} from 'recharts';
import { Employee, LeaveRecord } from '../types';
import { calculateEmployeeStats, LEAVE_TYPE_LABELS } from '../utils/vacationCalc';
import { VacationSimulator } from './VacationSimulator';

interface DashboardOverviewProps {
  employees: Employee[];
  leaveRecords: LeaveRecord[];
  onOpenLeaveModal: (employeeId?: string) => void;
  onSelectEmployee: (employeeId: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  employees,
  leaveRecords,
  onOpenLeaveModal,
  onSelectEmployee,
}) => {
  const [chartMode, setChartMode] = useState<'all' | 'solde'>('all');

  // Calcul global de l'ensemble des employés
  const statsList = employees.map((emp) => ({
    employee: emp,
    stats: calculateEmployeeStats(emp, leaveRecords),
  }));

  const totalEmployees = employees.length;
  const countLocal = employees.filter((e) => e.status === 'LOCAL').length;
  const countExpat = employees.filter((e) => e.status === 'EXPAT').length;
  const totalDebtDays = statsList.reduce((acc, curr) => acc + (curr.stats.isDebt ? curr.stats.debtDays : 0), 0);
  const totalUnpaidLeaveDays = statsList.reduce((acc, curr) => acc + curr.stats.unpaidLeaveDays, 0);
  const exceededEmployees = statsList.filter((s) => s.stats.isExceededAllocatedDays);

  // Données pour le graphique Recharts
  const chartData = statsList.map(({ employee, stats }) => ({
    id: employee.id,
    name: employee.name,
    idNumber: employee.idNumber || 'SANS-MAT',
    position: employee.position || 'Collaborateur',
    status: employee.status === 'EXPAT' ? 'Expatrié (EXPAT)' : 'Personnel Local (LOCAL)',
    shortName: employee.name.length > 14 ? employee.name.substring(0, 12) + '...' : employee.name,
    acquis: Number((stats.totalAccruedDays ?? 0).toFixed(1)),
    pris: stats.totalLeaveTakenDays ?? 0,
    solde: Number((stats.balanceDays ?? 0).toFixed(1)),
    isDebt: stats.isDebt ?? false,
    debtDays: Number((stats.debtDays ?? 0).toFixed(1)),
    contractType: employee.contractType === 'TYPE_A' ? 'Type A (30j/6m)' : 'Type B (30j/1an)',
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-stone-900 text-white p-3.5 rounded-xl shadow-xl text-xs space-y-2 border border-stone-700 min-w-[230px]">
          <div className="border-b border-stone-800 pb-1.5 flex justify-between items-start gap-2">
            <div>
              <p className="font-bold text-sm text-amber-300">{data.name}</p>
              <p className="text-2xs text-stone-400 font-mono">{data.idNumber} • {data.position}</p>
            </div>
            <span className="text-3xs px-2 py-0.5 rounded bg-stone-800 text-stone-300 font-mono shrink-0">
              {data.status.includes('EXPAT') ? 'EXPAT' : 'LOCAL'}
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-stone-400">Jours Acquis :</span>
              <span className="font-bold text-emerald-400 font-mono">+{data.acquis} j</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-stone-400">Congés Pris :</span>
              <span className="font-bold text-amber-400 font-mono">-{data.pris} j</span>
            </div>
            <div className="flex justify-between items-center pt-1.5 border-t border-stone-800">
              <span className="font-semibold text-stone-300">Solde Actuel :</span>
              {data.isDebt ? (
                <span className="font-extrabold text-red-400 flex items-center gap-1 font-mono">
                  🔴 -{data.debtDays} j (Négatif)
                </span>
              ) : (
                <span className="font-extrabold text-emerald-400 font-mono">
                  +{data.solde} j
                </span>
              )}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Repartition globale des types d'absences
  const globalLeaves = {
    congePaye: leaveRecords.filter((r) => r.leaveType === 'CONGE_PAYE').reduce((sum, r) => sum + r.daysCount, 0),
    maladie: leaveRecords.filter((r) => r.leaveType === 'MALADIE_JUSTIFIEE').reduce((sum, r) => sum + r.daysCount, 0),
    paternite: leaveRecords.filter((r) => r.leaveType === 'PATERNITE').reduce((sum, r) => sum + r.daysCount, 0),
    mariage: leaveRecords.filter((r) => r.leaveType === 'MARIAGE').reduce((sum, r) => sum + r.daysCount, 0),
    deces: leaveRecords.filter((r) => r.leaveType === 'DECES').reduce((sum, r) => sum + r.daysCount, 0),
    autre: leaveRecords.filter((r) => r.leaveType === 'AUTRE').reduce((sum, r) => sum + r.daysCount, 0),
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 text-white rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-700/60 border border-stone-600/60 text-amber-300 text-xs font-semibold uppercase tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5" />
              Centre de Suivi RH & Calcul des Soldes
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Gestion du Solde de Congés & Absences
            </h1>
            <p className="text-stone-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Suivez en temps réel les soldes de congés acquis, les avances consommées et le statut contractuel (Personnel Local vs Expatrié).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              id="btn-dashboard-previous-leave"
              onClick={() => onOpenLeaveModal()}
              className="inline-flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold text-xs px-4 py-3 rounded-xl border border-stone-700 transition-all shadow-xs cursor-pointer active:scale-98"
            >
              <Calendar className="w-4 h-4 text-amber-400" />
              Saisir Congé Passé
            </button>
            <button
              id="btn-dashboard-new-leave"
              onClick={() => onOpenLeaveModal()}
              className="inline-flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs sm:text-sm px-5 py-3 rounded-xl transition-all shadow-md active:scale-98 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Saisir Nouvelle Absence
            </button>
          </div>
        </div>
      </div>

      {/* Alerte - Dépassement des Jours Acquis */}
      {exceededEmployees.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300/80 rounded-2xl p-4 md:p-5 text-amber-950 space-y-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 border border-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="font-bold text-amber-950 text-base flex items-center gap-2">
                Dépassement des Jours Acquis ({exceededEmployees.length} employé(s))
              </h3>
              <p className="text-xs text-amber-800">
                Ces employés ont consommé plus de congés payés que les jours accumulés par leur travail (solde négatif en avance).
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
            {exceededEmployees.map(({ employee, stats }) => (
              <div key={employee.id} className="bg-white p-3 rounded-xl border border-amber-200 text-xs flex justify-between items-center shadow-2xs">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-stone-900">{employee.name}</p>
                    <span className="font-mono text-[10px] text-stone-500 font-bold">({employee.idNumber})</span>
                  </div>
                  <p className="text-red-700 font-bold mt-0.5">
                    Dépassement: +{stats.exceededDays.toFixed(1)} j en avance
                  </p>
                  <p className="text-2xs text-stone-500">
                    Acquis: {stats.totalAccruedDays.toFixed(1)} j | Pris: {stats.totalLeaveTakenDays} j
                  </p>
                </div>
                <button
                  onClick={() => onSelectEmployee(employee.id)}
                  className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0"
                >
                  Détails
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary KPI Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Employés & Repartition */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Effectif Global</p>
            <p className="text-2xl font-bold text-stone-900 mt-1">{totalEmployees}</p>
            <div className="flex items-center gap-2 text-2xs text-stone-600 mt-1 font-semibold">
              <span className="text-teal-700">{countLocal} Local</span>
              <span>•</span>
              <span className="text-purple-700">{countExpat} Expat</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-stone-800" />
          </div>
        </div>

        {/* Total Solde Négatif en Jours */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Solde Négatif Global</p>
            <p className="text-2xl font-bold text-red-600 mt-1 font-mono">
              -{totalDebtDays.toFixed(1)} <span className="text-sm font-medium text-red-700">jours</span>
            </p>
            <p className="text-xs text-stone-500 mt-0.5">
              Avances de congés à résorber par le travail
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        {/* Congés Non Payés (Sans Solde) */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Congés Sans Solde</p>
            <p className="text-2xl font-bold text-amber-600 mt-1 font-mono">
              {totalUnpaidLeaveDays} <span className="text-sm font-medium text-amber-700">jours</span>
            </p>
            <p className="text-xs text-stone-500 mt-0.5">
              Congés non rémunérés accordés
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Banknote className="w-6 h-6" />
          </div>
        </div>

        {/* Congés Payés Pris */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Total Congés Consommés</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1 font-mono">
              {globalLeaves.congePaye} <span className="text-sm font-medium text-emerald-700">jours</span>
            </p>
            <p className="text-xs text-stone-500 mt-0.5">
              Total consommé sur l'ensemble de l'équipe
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Simulator for 30-day leave projection on previous solde */}
      {employees.length > 0 && (
        <VacationSimulator
          employees={employees}
          leaveRecords={leaveRecords}
          onOpenLeaveModal={onOpenLeaveModal}
        />
      )}

      {/* Visualisation Recharts Bar Chart - Repartition des Soldes par Employé */}
      {employees.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-600" />
                Graphique des Soldes & Consommation par Employé
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Comparatif visuel des jours acquis, des congés consommés et des soldes actuels pour chaque employé.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
              <button
                id="btn-chart-mode-all"
                onClick={() => setChartMode('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  chartMode === 'all'
                    ? 'bg-white text-stone-900 shadow-2xs font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Aperçu Global
              </button>
              <button
                id="btn-chart-mode-solde"
                onClick={() => setChartMode('solde')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  chartMode === 'solde'
                    ? 'bg-white text-stone-900 shadow-2xs font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Focus Solde Net
              </button>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                <XAxis 
                  dataKey="shortName" 
                  tick={{ fill: '#57534e', fontSize: 11, fontWeight: 600 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e7e5e4' }}
                  interval={0}
                />
                <YAxis 
                  tick={{ fill: '#78716c', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e7e5e4' }}
                  unit=" j"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ paddingTop: 15, fontSize: 12 }} 
                  iconType="circle"
                />
                <ReferenceLine y={0} stroke="#a8a29e" strokeDasharray="3 3" />
                
                {chartMode === 'all' ? (
                  <>
                    <Bar dataKey="acquis" name="Jours Acquis" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="pris" name="Congés Pris" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="solde" name="Solde Actuel" radius={[4, 4, 0, 0]} barSize={20}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.isDebt ? '#ef4444' : '#059669'} />
                      ))}
                    </Bar>
                  </>
                ) : (
                  <Bar dataKey="solde" name="Solde Net (Jours)" radius={[6, 6, 0, 0]} barSize={34}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-solde-${index}`} fill={entry.isDebt ? '#ef4444' : '#10b981'} />
                    ))}
                  </Bar>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Main Employee Balance Table */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-stone-900">Tableau Général des Soldes & Régularisations</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Visualisation du solde de congés avec Matricule, Poste, Statut (Personnel Local vs Expatrié) et régularisation estimée.
            </p>
          </div>
        </div>

        {employees.length === 0 ? (
          <div className="p-10 text-center text-stone-500 text-xs">
            Aucun collaborateur enregistré. Cliquez sur "Ajouter un Employé" dans l'onglet Effectif ou importez une liste.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-200/80 text-stone-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-6">Employé & Matricule</th>
                  <th className="py-3.5 px-6">Poste & Statut</th>
                  <th className="py-3.5 px-6">Contrat & Embauche</th>
                  <th className="py-3.5 px-6">Congés Acquis / Pris</th>
                  <th className="py-3.5 px-6">Solde de Congés</th>
                  <th className="py-3.5 px-6">Régularisation Nécessaire</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-sm">
                {statsList.map(({ employee: emp, stats }) => (
                  <tr key={emp.id} className="hover:bg-stone-50/60 transition-colors">
                    {/* Employé & Matricule */}
                    <td className="py-4 px-6 font-semibold text-stone-900">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className={`w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs text-white ${
                            emp.status === 'EXPAT' ? 'bg-purple-900' : 'bg-stone-900'
                          }`}>
                            {emp.name.charAt(0)}
                          </div>
                          {stats.isDebt && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-600 border-2 border-white ring-2 ring-red-400/50" title="Solde négatif à régulariser" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-stone-900">{emp.name}</p>
                            {stats.isDebt && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-extrabold bg-red-100 text-red-700 border border-red-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
                                Doit {stats.debtDays.toFixed(1)} j
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-mono font-bold text-stone-600">{emp.idNumber || 'SANS-MAT'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Poste & Statut */}
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-stone-800">{emp.position || 'Collaborateur'}</p>
                        {emp.status === 'EXPAT' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                            <Globe className="w-3 h-3 text-purple-700" />
                            Expatrié (EXPAT)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-900 border border-teal-300">
                            <Building2 className="w-3 h-3 text-teal-700" />
                            Personnel Local (LOCAL)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Contrat & Embauche */}
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        {emp.contractType === 'TYPE_A' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                            Type A (30j / 6m)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200/80">
                            Type B (30j / 12m)
                          </span>
                        )}
                        <p className="text-xs text-stone-500 font-medium">
                          Embauché le {new Date(emp.hireDate).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </td>

                    {/* Acquis / Pris */}
                    <td className="py-4 px-6 text-stone-700 font-mono">
                      <div className="text-xs space-y-0.5">
                        <p className="text-emerald-700 font-medium">Acquis: +{stats.totalAccruedDays.toFixed(1)} j</p>
                        <p className="text-stone-600 font-medium">Pris: {stats.totalLeaveTakenDays} j</p>
                      </div>
                    </td>

                    {/* Solde Actuel */}
                    <td className="py-4 px-6">
                      {stats.isDebt ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-950 border border-red-300 font-mono">
                            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse shrink-0" />
                            Solde Négatif: -{stats.debtDays.toFixed(1)} j
                          </span>
                          <div className="text-2xs font-extrabold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-md flex items-center gap-1 shadow-2xs">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                            <span>Régulariser <strong>{stats.debtDays.toFixed(1)} jours</strong></span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Solde: +{stats.balanceDays.toFixed(1)} j
                          </span>
                          <p className="text-2xs text-emerald-700 font-medium">✓ Dans les jours acquis</p>
                        </div>
                      )}
                    </td>

                    {/* Estimation Régularisation */}
                    <td className="py-4 px-6">
                      {stats.isDebt ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 font-mono">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            ~{stats.daysToPayback} jours de travail
                          </span>
                          <p className="text-2xs text-stone-500">
                            Pour résorber le solde négatif
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-stone-400 italic">Aucune régularisation requise</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => onOpenLeaveModal(emp.id)}
                        className="inline-flex items-center gap-1 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all shadow-2xs cursor-pointer active:scale-98"
                      >
                        <Plus className="w-3.5 h-3.5 text-amber-400" />
                        Absence
                      </button>
                      <button
                        onClick={() => onSelectEmployee(emp.id)}
                        className="inline-flex items-center gap-1 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        Détails
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
