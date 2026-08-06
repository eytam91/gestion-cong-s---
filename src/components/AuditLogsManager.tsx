import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Smartphone, 
  Monitor, 
  Tablet, 
  History, 
  Trash2, 
  Download, 
  RefreshCw, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Database,
  FileCode,
  UserCheck,
  Server
} from 'lucide-react';
import { ActivityLog, DeviceSession } from '../types';
import { getActivityLogs, getDeviceSessions, clearAuditLogs, getOrCreateDeviceId } from '../utils/auditLogger';

interface AuditLogsManagerProps {
  onResetDemoData: () => void;
  onClearAllData: () => void;
  employeeCount: number;
  leaveRecordCount: number;
}

export const AuditLogsManager: React.FC<AuditLogsManagerProps> = ({
  onResetDemoData,
  onClearAllData,
  employeeCount,
  leaveRecordCount,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'activity' | 'devices' | 'database'>('activity');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  const currentDeviceId = getOrCreateDeviceId();
  const logs = getActivityLogs();
  const devices = getDeviceSessions();

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.actionLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.deviceId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const handleExportAuditCSV = () => {
    if (logs.length === 0) {
      alert("Aucun journal d'activité à exporter.");
      return;
    }

    const headers = ["ID Log", "Horodatage", "Action", "Description", "ID Appareil", "Type Appareil"];
    const rows = logs.map((log) => [
      `"${log.id}"`,
      `"${log.timestamp}"`,
      `"${log.actionLabel.replace(/"/g, '""')}"`,
      `"${log.details.replace(/"/g, '""')}"`,
      `"${log.deviceId}"`,
      `"${log.deviceType}"`
    ].join(';'));

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_logs_rh_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'Mobile':
        return <Smartphone className="w-4 h-4 text-emerald-600" />;
      case 'Tablet':
        return <Tablet className="w-4 h-4 text-amber-600" />;
      default:
        return <Monitor className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            <h2 className="text-xl font-bold text-stone-900">Registre d'Audit & Base Cloud SQL</h2>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Traçabilité des actions RH, synchronisation multi-appareils en temps réel avec Cloud SQL PostgreSQL (europe-west1).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportAuditCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            Exporter Logs (CSV)
          </button>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
        <button
          onClick={() => setActiveSubTab('activity')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'activity'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <History className="w-4 h-4" />
          Journal des Activités ({logs.length})
        </button>

        <button
          onClick={() => setActiveSubTab('devices')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'devices'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <Smartphone className="w-4 h-4 text-emerald-400" />
          Appareils Identifiés ({devices.length})
        </button>

        <button
          onClick={() => setActiveSubTab('database')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'database'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <Database className="w-4 h-4 text-amber-400" />
          Base de Données PostgreSQL
        </button>
      </div>

      {/* SUB-TAB 1: ACTIVITY LOGS */}
      {activeSubTab === 'activity' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Rechercher une action, appareil..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="w-3.5 h-3.5 text-stone-500" />
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              >
                <option value="ALL">Toutes les actions</option>
                <option value="EMPLOYEE_CREATED">Créations d'employés</option>
                <option value="EMPLOYEE_UPDATED">Modifications d'employés</option>
                <option value="EMPLOYEE_DELETED">Suppressions d'employés</option>
                <option value="LEAVE_ADDED">Saisies de congés</option>
                <option value="LEAVE_DELETED">Annulations de congés</option>
                <option value="DEVICE_CONNECTED">Connexions d'appareils</option>
                <option value="DATA_RESET">Rechargements Démo</option>
                <option value="DATA_CLEARED">Nettoyages de la base</option>
              </select>
            </div>
          </div>

          {/* Logs List */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            {filteredLogs.length === 0 ? (
              <div className="p-8 text-center text-stone-500 space-y-2">
                <Clock className="w-8 h-8 mx-auto text-stone-300" />
                <p className="text-sm font-semibold">Aucun événement enregistré dans les critères actuels.</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {filteredLogs.map((log) => {
                  const isCurrentDevice = log.deviceId === currentDeviceId;
                  return (
                    <div key={log.id} className="p-4 hover:bg-stone-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-stone-100 text-stone-700 shrink-0 mt-0.5">
                          {getDeviceIcon(log.deviceType)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-stone-900">{log.actionLabel}</span>
                            <span className="text-3xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-mono">
                              {new Date(log.timestamp).toLocaleString('fr-FR')}
                            </span>
                            {isCurrentDevice && (
                              <span className="text-3xs bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                                Cet Appareil
                              </span>
                            )}
                          </div>
                          <p className="text-stone-600 mt-1 font-sans">{log.details}</p>
                          <div className="flex items-center gap-3 mt-1 text-3xs text-stone-400 font-mono">
                            <span>ID Appareil : {log.deviceId}</span>
                            <span>•</span>
                            <span>Type : {log.deviceType}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: IDENTIFIED DEVICES */}
      {activeSubTab === 'devices' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map((dev) => {
              const isCurrent = dev.deviceId === currentDeviceId;
              return (
                <div 
                  key={dev.deviceId}
                  className={`bg-white rounded-xl border p-4 shadow-2xs space-y-3 relative ${
                    isCurrent ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-stone-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-stone-100">
                        {getDeviceIcon(dev.deviceType)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-stone-900 text-xs">{dev.deviceType}</span>
                          {isCurrent && (
                            <span className="text-3xs bg-emerald-600 text-white font-extrabold px-1.5 py-0.5 rounded">
                              Session Actuelle
                            </span>
                          )}
                        </div>
                        <p className="text-3xs text-stone-500 font-mono">{dev.platform}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-stone-600 border-t border-stone-100 pt-2 font-mono text-3xs">
                    <div className="flex justify-between">
                      <span className="text-stone-400">ID Unique :</span>
                      <span className="font-bold text-stone-800">{dev.deviceId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">Résolution :</span>
                      <span className="text-stone-700">{dev.screenResolution}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">Langue :</span>
                      <span className="text-stone-700">{dev.language}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">1ère Connexion :</span>
                      <span className="text-stone-700">{new Date(dev.firstConnectedAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">Dernière Activité :</span>
                      <span className="text-stone-700">{new Date(dev.lastActiveAt).toLocaleTimeString('fr-FR')}</span>
                    </div>
                  </div>

                  <div className="bg-stone-50 p-2 rounded-lg text-3xs text-stone-500 break-all font-mono">
                    {dev.userAgent.substring(0, 90)}...
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: DATABASE MANAGEMENT */}
      {activeSubTab === 'database' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-stone-900 font-bold text-base">
              <Server className="w-5 h-5 text-amber-500" />
              État de la Base PostgreSQL Cloud SQL
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                <span className="block text-2xl font-extrabold text-stone-900 font-mono">{employeeCount}</span>
                <span className="text-xs text-stone-500 font-semibold">Employés Enregistrés</span>
              </div>

              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                <span className="block text-2xl font-extrabold text-stone-900 font-mono">{leaveRecordCount}</span>
                <span className="text-xs text-stone-500 font-semibold">Saisies de Congés</span>
              </div>
            </div>

            <div className="border-t border-stone-100 pt-4 space-y-3">
              <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">Actions de Base</h4>

              <div className="space-y-2">
                <button
                  onClick={onClearAllData}
                  className="w-full inline-flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-all border border-red-200 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                  Vider la Base (Effacer tous les enregistrements)
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-stone-900 font-bold text-base">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              Schéma PostgreSQL Actif
            </div>

            <div className="text-xs text-stone-600 space-y-2 bg-stone-50 p-3.5 rounded-xl border border-stone-200 font-mono text-[11px]">
              <p className="font-bold text-stone-800 font-sans">Tables & Colonnes:</p>
              <ul className="space-y-1 text-stone-600 list-disc list-inside">
                <li><strong className="text-stone-900">employees:</strong> id, id_number, name, position, status ('LOCAL' | 'EXPAT'), hire_date, contract_type ('TYPE_A' | 'TYPE_B')</li>
                <li><strong className="text-stone-900">leave_records:</strong> id, employee_id, start_date, end_date, days_count, leave_type, is_paid, notes</li>
                <li><strong className="text-stone-900">audit_logs:</strong> id, action, action_label, details, device_id, device_type, timestamp</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
