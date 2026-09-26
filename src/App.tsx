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
  Globe,
  Lock,
  Eye,
  EyeOff,
  Shield
} from 'lucide-react';
import { Employee, LeaveRecord } from './types';
import { DashboardOverview } from './components/DashboardOverview';
import { EmployeeManager } from './components/EmployeeManager';
import { LedgerHistory } from './components/LedgerHistory';
import { LeaveLedgerModal } from './components/LeaveLedgerModal';
import { AuditLogsManager } from './components/AuditLogsManager';
import { UserManager } from './components/UserManager';
import { AuthModal } from './components/AuthModal';
import { Gate } from './components/Gate';
import { PrivacyScreenLock } from './components/PrivacyScreenLock';
import { registerDeviceConnection, addActivityLog } from './utils/auditLogger';
import { useAuth } from './context/AuthContext';
import { useConfidentiality } from './context/ConfidentialityContext';
import { 
  fetchAllData, 
  fetchEmployees, 
  saveEmployee, 
  batchSaveEmployees, 
  updateEmployeeDoc, 
  deleteEmployeeDoc, 
  fetchLeaveRecords, 
  saveLeaveRecord, 
  deleteLeaveRecordDoc, 
  resetDemoDataToFirestore, 
  clearAllFirestoreData 
} from './services/firestoreService';

export default function App() {
  const { 
    user, 
    dbUser, 
    loading: authLoading, 
    isAdmin, 
    isStaff, 
    isPending, 
    isAuthenticated, 
    logout,
    reloadUserProfile 
  } = useAuth();

  const { isConfidentialMode, toggleConfidentialMode, lockScreenNow } = useConfidentiality();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees' | 'ledger' | 'audit' | 'users'>('dashboard');
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dbConnected, setDbConnected] = useState(true);

  // Leave Modal State
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [modalInitialEmployeeId, setModalInitialEmployeeId] = useState<string | undefined>(undefined);
  const [selectedEmployeeIdForView, setSelectedEmployeeIdForView] = useState<string | null>(null);

  // Register Device on Mount
  useEffect(() => {
    registerDeviceConnection();
  }, []);

  // Fetch HR data from Firestore once authenticated with staff access
  const loadData = async () => {
    if (!isStaff) return;
    setIsLoading(true);
    try {
      const { employees: fetchedEmps, leaveRecords: fetchedLeaves } = await fetchAllData();
      setEmployees(fetchedEmps);
      setLeaveRecords(fetchedLeaves);
      setDbConnected(true);
    } catch (err) {
      console.error('Failed to load data from Firestore:', err);
      setDbConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isStaff) {
      loadData();
    }
  }, [isStaff]);

  // Auth Guard: Loading Splash
  if (authLoading) {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-stone-900 text-white flex items-center justify-center shadow-lg animate-pulse mb-4">
          <Shield className="w-6 h-6 text-amber-400" />
        </div>
        <p className="text-xs font-bold text-stone-600">Chargement de la session RH...</p>
      </div>
    );
  }

  // Auth Guard: Unauthenticated -> Show AuthModal
  if (!isAuthenticated) {
    return <AuthModal canClose={false} />;
  }

  // Auth Guard: Authenticated but role is PENDING
  if (isPending) {
    return <Gate type="pending" onRetry={reloadUserProfile} />;
  }

  const handleResetDemoData = async () => {
    if (!isAdmin) {
      alert("Habilitation insuffisante : Seul un Administrateur RH peut recharger les données démo.");
      return;
    }
    if (window.confirm('Recharger le jeu de données démo exemple dans Cloud Firestore ?')) {
      setIsLoading(true);
      try {
        await resetDemoDataToFirestore();
        const [emps, leaves] = await Promise.all([fetchEmployees(), fetchLeaveRecords()]);
        setEmployees(emps);
        setLeaveRecords(leaves);

        addActivityLog({
          action: 'DATA_RESET',
          actionLabel: 'Rechargement Démo',
          details: 'Rechargement du jeu de données démo en base de données Cloud Firestore.',
          actorUid: user?.uid,
          actorName: dbUser?.name || 'Administrateur',
          actorRole: dbUser?.role,
        });
      } catch (err) {
        console.error('Reset failed:', err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleClearAllData = async () => {
    if (!isAdmin) {
      alert("Habilitation refusée : Seuls les utilisateurs avec le rôle Administrateur ont le droit de purger la base de données.");
      return;
    }
    if (window.confirm('ATTENTION SÉCURITÉ: Vider complètement tous les employés et congés dans Cloud Firestore ? Cette action est irréversible.')) {
      setIsLoading(true);
      try {
        await clearAllFirestoreData();
        setEmployees([]);
        setLeaveRecords([]);

        addActivityLog({
          action: 'DATA_CLEARED',
          actionLabel: 'Nettoyage Base',
          details: 'Suppression de tous les enregistrements dans Cloud Firestore.',
          actorUid: user?.uid,
          actorName: dbUser?.name || 'Administrateur',
          actorRole: dbUser?.role,
        });
      } catch (err) {
        console.error('Clear failed:', err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Handlers for Employee
  const handleBatchImportEmployees = async (importedEmployees: Employee[]) => {
    try {
      await batchSaveEmployees(importedEmployees);
      const emps = await fetchEmployees();
      setEmployees(emps);

      addActivityLog({
        action: 'EMPLOYEES_IMPORTED',
        actionLabel: 'Import Multiple Employés',
        details: `Import: ${importedEmployees.length} employés synchronisés dans Cloud Firestore.`,
        actorUid: user?.uid,
        actorName: dbUser?.name,
        actorRole: dbUser?.role,
      });
    } catch (err) {
      console.error('Batch import failed:', err);
      throw err;
    }
  };

  const handleAddEmployee = async (employeeData: Omit<Employee, 'id' | 'createdAt'>) => {
    const newEmployee: Employee = {
      ...employeeData,
      id: `emp-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    try {
      const saved = await saveEmployee(newEmployee);
      setEmployees((prev) => [saved, ...prev]);

      addActivityLog({
        action: 'EMPLOYEE_CREATED',
        actionLabel: 'Création Employé',
        details: `Ajout de ${saved.name} (${saved.status}, Matricule ${saved.idNumber || 'SANS-MAT'}) dans Cloud Firestore`,
        targetId: saved.id,
        actorUid: user?.uid,
        actorName: dbUser?.name,
        actorRole: dbUser?.role,
      });
    } catch (err) {
      console.error('Failed to add employee:', err);
    }
  };

  const handleUpdateEmployee = async (updatedEmployee: Employee) => {
    try {
      const updated = await updateEmployeeDoc(updatedEmployee);
      setEmployees((prev) =>
        prev.map((emp) => (emp.id === updated.id ? updated : emp))
      );

      addActivityLog({
        action: 'EMPLOYEE_UPDATED',
        actionLabel: 'Mise à Jour Employé',
        details: `Modification de la fiche de ${updated.name} dans Cloud Firestore`,
        targetId: updated.id,
        actorUid: user?.uid,
        actorName: dbUser?.name,
        actorRole: dbUser?.role,
      });
    } catch (err) {
      console.error('Failed to update employee:', err);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!isAdmin) {
      alert("Habilitation refusée : Seul un Administrateur peut supprimer un employé.");
      return;
    }
    const empToDelete = employees.find((e) => e.id === id);
    try {
      await deleteEmployeeDoc(id);
      setEmployees((prev) => prev.filter((emp) => emp.id !== id));
      setLeaveRecords((prev) => prev.filter((rec) => rec.employeeId !== id));

      addActivityLog({
        action: 'EMPLOYEE_DELETED',
        actionLabel: 'Suppression Employé',
        details: `Suppression de l'employé ${empToDelete?.name || id} dans Cloud Firestore.`,
        targetId: id,
        actorUid: user?.uid,
        actorName: dbUser?.name,
        actorRole: dbUser?.role,
      });
    } catch (err) {
      console.error('Failed to delete employee:', err);
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
      const saved = await saveLeaveRecord(newRecord);
      setLeaveRecords((prev) => [saved, ...prev]);

      const targetEmp = employees.find((e) => e.id === recordData.employeeId);
      addActivityLog({
        action: 'LEAVE_ADDED',
        actionLabel: 'Saisie de Congé',
        details: `Enregistrement de ${saved.daysCount}j pour ${targetEmp?.name || recordData.employeeId} (${saved.startDate} -> ${saved.endDate}) dans Cloud Firestore`,
        targetId: saved.id,
        actorUid: user?.uid,
        actorName: dbUser?.name,
        actorRole: dbUser?.role,
      });
    } catch (err) {
      console.error('Failed to add leave record:', err);
    }
  };

  const handleDeleteLeaveRecord = async (id: string) => {
    const recToDelete = leaveRecords.find((r) => r.id === id);
    try {
      await deleteLeaveRecordDoc(id);
      setLeaveRecords((prev) => prev.filter((r) => r.id !== id));

      addActivityLog({
        action: 'LEAVE_DELETED',
        actionLabel: 'Annulation Congé',
        details: `Annulation du congé ID ${id} (${recToDelete?.daysCount || 0} jours) dans Cloud Firestore.`,
        targetId: id,
        actorUid: user?.uid,
        actorName: dbUser?.name,
        actorRole: dbUser?.role,
      });
    } catch (err) {
      console.error('Failed to delete leave record:', err);
    }
  };

  const handleOpenLeaveModal = (empId?: string) => {
    setModalInitialEmployeeId(empId);
    setIsLeaveModalOpen(true);
  };

  const handleSelectEmployeeDetail = (empId: string) => {
    setSelectedEmployeeIdForView(empId);
    setActiveTab('employees');
  };

  return (
    <div className="min-h-screen bg-stone-100/70 text-stone-800 flex flex-col justify-between font-sans selection:bg-amber-100 selection:text-amber-900">
      {/* Session Lock Screen for Confidentiality */}
      <PrivacyScreenLock />

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
                  Cloud Firestore
                </span>
                <span className="hidden md:inline-flex items-center gap-1 text-2xs bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-mono font-semibold">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Règles RBAC Actives
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Confidentiality Shield Toggle */}
            <button
              id="btn-toggle-confidentiality"
              onClick={toggleConfidentialMode}
              title={isConfidentialMode ? "Désactiver le masquage automatique des données confidentielles" : "Activer le masque de confidentialité RH (Salaires, Pièces d'identité, INSESO)"}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                isConfidentialMode
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100 shadow-2xs'
                  : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 ring-1 ring-amber-400/40'
              }`}
            >
              {isConfidentialMode ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="hidden sm:inline">Bouclier RH Actif</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 text-amber-600" />
                  <span className="hidden sm:inline text-amber-900">Données en clair</span>
                </>
              )}
            </button>

            {/* Quick Lock Session Button */}
            <button
              id="btn-quick-lock-session"
              onClick={lockScreenNow}
              title="Verrouiller immédiatement la session RH (Protection Anti-Regard / Départ momentané)"
              className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-all cursor-pointer border border-stone-200"
            >
              <Lock className="w-4 h-4 text-stone-600" />
            </button>

            {/* Refresh Button */}
            <button
              onClick={loadData}
              title="Rafraîchir les données Cloud Firestore"
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

            {/* User Profile & Logout */}
            <div className="flex items-center gap-2 bg-stone-100 p-1.5 rounded-xl border border-stone-200">
              <div className="w-7 h-7 rounded-lg bg-stone-900 text-white flex items-center justify-center font-bold text-xs">
                {dbUser?.name ? dbUser.name[0].toUpperCase() : (user?.displayName ? user.displayName[0].toUpperCase() : 'U')}
              </div>
              <div className="hidden lg:block text-left pr-1">
                <p className="text-2xs font-bold text-stone-900 leading-tight truncate max-w-[130px]">
                  {dbUser?.name || user?.displayName || user?.email}
                </p>
                <p className={`text-[10px] font-bold ${isAdmin ? 'text-purple-700' : 'text-teal-700'}`}>
                  {dbUser?.role || 'Collaborateur'}
                </p>
              </div>
              <button
                onClick={logout}
                title="Se déconnecter de la session"
                className="p-1.5 text-stone-500 hover:text-rose-600 rounded-lg hover:bg-stone-200 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
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
                <UserIcon className="w-4 h-4 text-purple-600" />
                Utilisateurs & Rôles
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Database Status Banner */}
      <div className="bg-stone-900 text-stone-200 text-xs py-2 px-4 border-b border-stone-800">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-400" />
            <span>
              <strong>Base Cloud Firestore Active :</strong> Données RH synchronisées et sécurisées avec règles de contrôle d'accès basées sur les rôles (RBAC).
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-stone-800 px-2 py-0.5 rounded text-[11px] border border-stone-700 font-mono text-stone-300">
              Rôle : {dbUser?.role || 'Utilisateur'}
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[11px] border border-emerald-500/40 font-mono">
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
            <p className="text-sm font-medium">Chargement des données depuis Cloud Firestore...</p>
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
                initialSelectedEmployeeId={selectedEmployeeIdForView}
                canDelete={isAdmin}
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

      {/* Leave Ledger Modal */}
      <LeaveLedgerModal
        isOpen={isLeaveModalOpen}
        onClose={() => {
          setIsLeaveModalOpen(false);
          setModalInitialEmployeeId(undefined);
        }}
        employees={employees}
        onAddLeaveRecord={handleAddLeaveRecord}
        initialEmployeeId={modalInitialEmployeeId}
      />

      {/* Footer */}
      <footer className="border-t border-stone-200/80 bg-white py-6 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-semibold text-stone-700">Système de Gestion des Congés & Dossiers RH</p>
          <p className="text-2xs text-stone-400">
            Cycles Type A (6 mois) et Type B (1 an) • Synchronisation Cloud Firestore • Sécurité RBAC
          </p>
        </div>
      </footer>
    </div>
  );
}
