import React, { useState, useEffect } from 'react';
import { 
  Users, 
  LayoutDashboard, 
  FileText, 
  Plus, 
  Building2, 
  CheckCircle2, 
  ShieldCheck, 
  Database, 
  LogIn, 
  LogOut, 
  User as UserIcon,
  RefreshCw,
  Globe
} from 'lucide-react';
import { Employee, LeaveRecord } from './types';
import { DashboardOverview } from './components/DashboardOverview';
import { EmployeeManager } from './components/EmployeeManager';
import { LedgerHistory } from './components/LedgerHistory';
import { LeaveLedgerModal } from './components/LeaveLedgerModal';
import { AuditLogsManager } from './components/AuditLogsManager';
import { UserManager } from './components/UserManager';
import { AuthModal } from './components/AuthModal';
import { registerDeviceConnection, addActivityLog } from './utils/auditLogger';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { user, dbUser, signInWithGoogle, logout, idToken } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees' | 'ledger' | 'audit' | 'users'>('dashboard');
  
  const isAdmin = dbUser?.role === 'ADMIN';
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbConnected, setDbConnected] = useState(true);

  // Leave Modal State
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [modalInitialEmployeeId, setModalInitialEmployeeId] = useState<string | undefined>(undefined);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Register Device on Mount
  useEffect(() => {
    registerDeviceConnection();
  }, []);

  // Fetch initial data from Cloud SQL API
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [empRes, leaveRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/leave-records')
      ]);

      if (empRes.ok && leaveRes.ok) {
        const empData = await empRes.json();
        const leaveData = await leaveRes.json();
        setEmployees(empData);
        setLeaveRecords(leaveData);
        setDbConnected(true);
      } else {
        setDbConnected(false);
      }
    } catch (err) {
      console.error('Failed to fetch data from Cloud SQL:', err);
      setDbConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }
    return headers;
  };

  const handleResetDemoData = async () => {
    if (window.confirm('Recharger le jeu de données démo exemple (Employé X inclus) dans Cloud SQL ?')) {
      try {
        await fetch('/api/reset-demo', {
          method: 'POST',
          headers: getAuthHeaders(),
        });
        await fetchData();

        addActivityLog({
          action: 'DATA_RESET',
          actionLabel: 'Rechargement Démo Cloud SQL',
          details: 'Rechargement du jeu de données démo en base de données PostgreSQL.',
        });
      } catch (err) {
        console.error('Reset failed:', err);
      }
    }
  };

  const handleClearAllData = async () => {
    if (window.confirm('ATTENTION: Vider complètement tous les employés et congés dans la base PostgreSQL ?')) {
      try {
        await fetch('/api/clear-data', {
          method: 'POST',
          headers: getAuthHeaders(),
        });
        await fetchData();

        addActivityLog({
          action: 'DATA_CLEARED',
          actionLabel: 'Nettoyage Cloud SQL',
          details: 'Suppression de tous les enregistrements dans la base de données PostgreSQL.',
        });
      } catch (err) {
        console.error('Clear failed:', err);
      }
    }
  };

  // Handlers for Employee
  const handleBatchImportEmployees = async (importedEmployees: Employee[]) => {
    try {
      const res = await fetch('/api/employees/batch', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(importedEmployees),
      });
      if (res.ok) {
        const result = await res.json();
        await fetchData();

        addActivityLog({
          action: 'EMPLOYEE_CREATED',
          actionLabel: 'Import Multiple Employés',
          details: `Import CSV: ${result.insertedCount} employés ajoutés, ${result.updatedCount} mis à jour dans Cloud SQL.`,
        });
      } else {
        const err = await res.json();
        alert(`Erreur lors de l'import : ${err.error}`);
      }
    } catch (err) {
      console.error('Failed to batch import employees:', err);
      alert("Erreur lors de l'import CSV");
    }
  };

  const handleAddEmployee = async (newEmpData: Omit<Employee, 'id' | 'createdAt'>) => {
    const newEmp: Employee = {
      ...newEmpData,
      id: `emp-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newEmp),
      });
      if (res.ok) {
        const saved = await res.json();
        setEmployees((prev) => [saved, ...prev]);

        addActivityLog({
          action: 'EMPLOYEE_CREATED',
          actionLabel: 'Création Employé',
          details: `Ajout de l'employé ${saved.name} (${saved.contractType}) dans Cloud SQL`,
          targetId: saved.id,
        });
      }
    } catch (err) {
      console.error('Failed to add employee:', err);
    }
  };

  const handleUpdateEmployee = async (updatedEmp: Employee) => {
    try {
      const res = await fetch(`/api/employees/${updatedEmp.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedEmp),
      });
      if (res.ok) {
        const saved = await res.json();
        setEmployees((prev) => prev.map((emp) => (emp.id === saved.id ? saved : emp)));

        addActivityLog({
          action: 'EMPLOYEE_UPDATED',
          actionLabel: 'Modification Employé',
          details: `Mise à jour de ${saved.name} dans Cloud SQL`,
          targetId: saved.id,
        });
      }
    } catch (err) {
      console.error('Failed to update employee:', err);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    const empToDelete = employees.find((e) => e.id === id);
    if (window.confirm(`Confirmer la suppression définitive de ${empToDelete?.name || 'cet employé'} dans la base Cloud SQL ?`)) {
      try {
        const res = await fetch(`/api/employees/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          setEmployees((prev) => prev.filter((emp) => emp.id !== id));
          setLeaveRecords((prev) => prev.filter((r) => r.employeeId !== id));

          addActivityLog({
            action: 'EMPLOYEE_DELETED',
            actionLabel: 'Suppression Employé',
            details: `Suppression de l'employé ${empToDelete?.name || id} dans Cloud SQL.`,
            targetId: id,
          });
        }
      } catch (err) {
        console.error('Failed to delete employee:', err);
      }
    }
  };

  // Handlers for Leave Record
  const handleAddLeaveRecord = async (recordData: Omit<LeaveRecord, 'id' | 'createdAt'>) => {
    const newRecord: LeaveRecord = {
      ...recordData,
      id: `rec-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/leave-records', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newRecord),
      });
      if (res.ok) {
        const saved = await res.json();
        setLeaveRecords((prev) => [saved, ...prev]);

        const targetEmp = employees.find((e) => e.id === recordData.employeeId);
        addActivityLog({
          action: 'LEAVE_ADDED',
          actionLabel: 'Saisie de Congé',
          details: `Enregistrement de ${saved.daysCount}j pour ${targetEmp?.name || recordData.employeeId} (${saved.startDate} -> ${saved.endDate}) dans Cloud SQL`,
          targetId: saved.id,
        });
      }
    } catch (err) {
      console.error('Failed to add leave record:', err);
    }
  };

  const handleDeleteLeaveRecord = async (id: string) => {
    const recToDelete = leaveRecords.find((r) => r.id === id);
    try {
      const res = await fetch(`/api/leave-records/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setLeaveRecords((prev) => prev.filter((r) => r.id !== id));

        addActivityLog({
          action: 'LEAVE_DELETED',
          actionLabel: 'Annulation Congé',
          details: `Annulation du congé ID ${id} (${recToDelete?.daysCount || 0} jours) dans Cloud SQL.`,
          targetId: id,
        });
      }
    } catch (err) {
      console.error('Failed to delete leave record:', err);
    }
  };

  const handleOpenLeaveModal = (empId?: string) => {
    setModalInitialEmployeeId(empId);
    setIsLeaveModalOpen(true);
  };

  const handleSelectEmployeeDetail = (empId: string) => {
    setActiveTab('employees');
  };

  return (
    <div className="min-h-screen bg-stone-100/70 text-stone-800 flex flex-col justify-between font-sans selection:bg-amber-100 selection:text-amber-900">
      {/* Header Bar */}
      <header className="border-b border-stone-200/80 bg-white sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-stone-900 text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <span className="font-bold text-stone-900 text-base tracking-tight">Gestion des Congés & RH</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center gap-1 text-2xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono font-bold border border-indigo-200">
                  <Database className="w-3 h-3 text-indigo-600" />
                  Cloud SQL (PostgreSQL)
                </span>
                <span className="hidden md:inline-flex items-center gap-1 text-2xs bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-mono">
                  <Globe className="w-3 h-3 text-emerald-600" />
                  Multi-Appareils Connectés
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Refresh Button */}
            <button
              onClick={fetchData}
              title="Rafraîchir les données Cloud SQL"
              className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-600' : ''}`} />
            </button>

            {/* Quick Add Leave Button */}
            <button
              id="btn-quick-add-absence"
              onClick={() => handleOpenLeaveModal()}
              className="inline-flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Nouveau Congé</span>
            </button>

            {/* Authentication Status / Button */}
            {user ? (
              <div className="flex items-center gap-2 bg-stone-100 p-1.5 rounded-xl border border-stone-200">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                  {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
                </div>
                <div className="hidden lg:block text-left pr-1">
                  <p className="text-2xs font-bold text-stone-900 leading-tight truncate max-w-[120px]">
                    {user.displayName || user.email}
                  </p>
                  <p className="text-[10px] text-emerald-600 font-semibold">Connecté</p>
                </div>
                <button
                  onClick={logout}
                  title="Se déconnecter"
                  className="p-1.5 text-stone-500 hover:text-red-600 rounded-lg hover:bg-stone-200 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-98"
              >
                <LogIn className="w-4 h-4" />
                <span>Connexion</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-t border-stone-100 bg-stone-50/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto">
            <button
              id="tab-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === 'dashboard'
                  ? 'border-stone-900 text-stone-900 bg-white'
                  : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-stone-100/50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Tableau de Bord
            </button>

            <button
              id="tab-employees"
              onClick={() => setActiveTab('employees')}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === 'employees'
                  ? 'border-stone-900 text-stone-900 bg-white'
                  : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-stone-100/50'
              }`}
            >
              <Users className="w-4 h-4" />
              Employés ({employees.length})
            </button>

            <button
              id="tab-ledger"
              onClick={() => setActiveTab('ledger')}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === 'ledger'
                  ? 'border-stone-900 text-stone-900 bg-white'
                  : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-stone-100/50'
              }`}
            >
              <FileText className="w-4 h-4" />
              Journal des Congés ({leaveRecords.length})
            </button>

            <button
              id="tab-audit"
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === 'audit'
                  ? 'border-stone-900 text-stone-900 bg-white'
                  : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-stone-100/50'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Audit & Appareils
            </button>

            {isAdmin && (
              <button
                id="tab-users"
                onClick={() => setActiveTab('users')}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === 'users'
                    ? 'border-stone-900 text-stone-900 bg-white'
                    : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-stone-100/50'
                }`}
              >
                <UserIcon className="w-4 h-4 text-indigo-600" />
                Utilisateurs
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Database Banner */}
      <div className="bg-indigo-900 text-indigo-100 text-xs py-2 px-4 border-b border-indigo-800">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-300 animate-pulse" />
            <span>
              <strong>Base PostgreSQL Cloud SQL Active:</strong> Toutes les données (Employés, Registre des Congés, Audit) sont centralisées et synchronisées entre tous vos appareils connectés.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-indigo-800/80 px-2 py-0.5 rounded text-[11px] border border-indigo-700/60 font-mono">
              Base: PostgreSQL
            </span>
            <span className="bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded text-[11px] border border-emerald-500/40 font-mono">
              ● Connecté
            </span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-stone-500">
            <RefreshCw className="w-8 h-8 animate-spin text-amber-600" />
            <p className="text-sm font-medium">Chargement des données depuis PostgreSQL Cloud SQL...</p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardOverview
                employees={employees}
                leaveRecords={leaveRecords}
                onOpenLeaveModal={handleOpenLeaveModal}
                onSelectEmployee={handleSelectEmployeeDetail}
              />
            )}

            {activeTab === 'employees' && (
              <EmployeeManager
                employees={employees}
                leaveRecords={leaveRecords}
                onAddEmployee={handleAddEmployee}
                onUpdateEmployee={handleUpdateEmployee}
                onDeleteEmployee={handleDeleteEmployee}
                onBatchImportEmployees={handleBatchImportEmployees}
                onOpenLeaveModal={handleOpenLeaveModal}
              />
            )}

            {activeTab === 'ledger' && (
              <LedgerHistory
                employees={employees}
                leaveRecords={leaveRecords}
                onDeleteLeaveRecord={handleDeleteLeaveRecord}
                onOpenLeaveModal={handleOpenLeaveModal}
              />
            )}

            {activeTab === 'audit' && (
              <AuditLogsManager
                onResetDemoData={handleResetDemoData}
                onClearAllData={handleClearAllData}
                employeeCount={employees.length}
                leaveRecordCount={leaveRecords.length}
              />
            )}

            {activeTab === 'users' && isAdmin && (
              <UserManager />
            )}
          </>
        )}
      </main>

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}

      {/* Admin Leave Modal */}
      <LeaveLedgerModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        employees={employees}
        leaveRecords={leaveRecords}
        initialEmployeeId={modalInitialEmployeeId}
        onAddLeaveRecord={handleAddLeaveRecord}
      />

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white text-xs text-stone-500 py-4 px-6 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Gestion RH, Calculateur de Solde & Base Cloud SQL Centralisée</span>
          </div>
          <span className="font-mono text-stone-400">Google AI Studio • PostgreSQL Cloud SQL</span>
        </div>
      </footer>
    </div>
  );
}
