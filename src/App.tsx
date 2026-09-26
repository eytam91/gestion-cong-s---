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
  Shield,
  Clock
} from 'lucide-react';
import { Employee, LeaveRecord } from './types';
import { DashboardOverview } from './components/DashboardOverview';
import { EmployeeManager } from './components/EmployeeManager';
import { LedgerHistory } from './components/LedgerHistory';
import { LeaveLedgerModal } from './components/LeaveLedgerModal';
import { AuditLogsManager } from './components/AuditLogsManager';
import { UserManager } from './components/UserManager';
import { AuthModal } from './components/AuthModal';
import { PrivacyScreenLock } from './components/PrivacyScreenLock';
import { registerDeviceConnection, addActivityLog } from './utils/auditLogger';
import { useAuth } from './context/AuthContext';
import { useConfidentiality } from './context/ConfidentialityContext';
import { 
  initializeFirestoreData, 
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

/** Full-screen state shown instead of the app when the viewer has no access. */
const AccessGate: React.FC<{
  icon: React.ReactNode;
  title: string;
  message: string;
  action?: React.ReactNode;
}> = ({ icon, title, message, action }) => (
  <div className="min-h-screen bg-stone-100/70 flex flex-col items-center justify-center p-6 text-center">
    <div className="bg-white rounded-3xl border border-stone-200 shadow-xs p-10 max-w-md w-full space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-stone-900 text-white flex items-center justify-center mx-auto">
        {icon}
      </div>
      <h1 className="text-lg font-bold text-stone-900">{title}</h1>
      <p className="text-xs text-stone-500 leading-relaxed">{message}</p>
      {action}
    </div>
  </div>
);

export default function App() {
  const {
    user,
    dbUser,
    logout,
    isAdmin,
    isStaff,
    isPending,
    profileError,
    refreshProfile,
    loading: authLoading,
  } = useAuth();
  const { isConfidentialMode, toggleConfidentialMode, lockScreenNow } = useConfidentiality();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees' | 'ledger' | 'audit' | 'users'>('dashboard');
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbConnected, setDbConnected] = useState(true);

  // Leave Modal State
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [modalInitialEmployeeId, setModalInitialEmployeeId] = useState<string | undefined>(undefined);
  const [selectedEmployeeIdForView, setSelectedEmployeeIdForView] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Register Device on Mount
  useEffect(() => {
    registerDeviceConnection();
  }, []);

  // Fetch initial data from Firestore, ensuring a fresh database
  const loadData = async () => {
    setIsLoading(true);
    try {
      const { employees: initialEmps, leaveRecords: initialLeaves } = await initializeFirestoreData();
      
      // If legacy demo records (e.g. emp-x, MAT-0001, etc.) were saved previously, automatically purge them
      const hasOldDemo = initialEmps.some((e) => e.id === 'emp-x' || e.id === 'emp-101' || e.idNumber === 'MAT-0001');
      if (hasOldDemo) {
        console.log('Purging previous demo employees to ensure fresh database...');
        await clearAllFirestoreData();
        setEmployees([]);
        setLeaveRecords([]);
      } else {
        setEmployees(initialEmps);
        setLeaveRecords(initialLeaves);
      }
      setDbConnected(true);
    } catch (err) {
      console.error('Failed to load data from Firestore:', err);
      setDbConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Only staff may read the HR collections, so loading earlier would just
  // produce permission errors.
  useEffect(() => {
    if (isStaff) {
      loadData();
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStaff]);

  const handleResetDemoData = async () => {
    if (!isAdmin) {
      alert("Habilitation insuffisante : Seul un Administrateur RH peut recharger les données démo.");
      return;
    }
    if (window.confirm('Recharger le jeu de données démo exemple (Employé X inclus) dans Cloud Firestore ?')) {
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
      });
    } catch (err) {
      console.error('Failed to batch import employees:', err);
    }
  };

  const handleAddEmployee = async (newEmpData: Omit<Employee, 'id' | 'createdAt'>) => {
    const newEmp: Employee = {
      ...newEmpData,
      id: `emp-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    try {
      const saved = await saveEmployee(newEmp);
      setEmployees((prev) => [saved, ...prev]);

      addActivityLog({
        action: 'EMPLOYEE_CREATED',
        actionLabel: 'Création Employé',
        details: `Ajout de l'employé ${saved.name} (${saved.contractType}) dans Cloud Firestore`,
        targetId: saved.id,
      });
    } catch (err) {
      console.error('Failed to add employee:', err);
    }
  };

  const handleUpdateEmployee = async (updatedEmp: Employee) => {
    try {
      const saved = await updateEmployeeDoc(updatedEmp);
      setEmployees((prev) => prev.map((emp) => (emp.id === saved.id ? saved : emp)));

      addActivityLog({
        action: 'EMPLOYEE_UPDATED',
        actionLabel: 'Modification Employé',
        details: `Mise à jour de ${saved.name} dans Cloud Firestore`,
        targetId: saved.id,
      });
    } catch (err) {
      console.error('Failed to update employee:', err);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!isAdmin) {
      alert("Habilitation refusée : Seuls les comptes Administrateurs sont autorisés à supprimer définitivement un dossier employé.");
      return;
    }
    const empToDelete = employees.find((e) => e.id === id);
    if (!window.confirm(`Confirmer la suppression définitive du dossier de ${empToDelete?.name || id} ?`)) {
      return;
    }
    try {
      await deleteEmployeeDoc(id);
      setEmployees((prev) => prev.filter((emp) => emp.id !== id));
      setLeaveRecords((prev) => prev.filter((r) => r.employeeId !== id));

      addActivityLog({
        action: 'EMPLOYEE_DELETED',
        actionLabel: 'Suppression Employé',
        details: `Suppression de l'employé ${empToDelete?.name || id} dans Cloud Firestore.`,
        targetId: id,
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

  const signOutButton = (
    <button
      onClick={logout}
      className="inline-flex items-center gap-1.5 text-stone-600 hover:text-stone-900 text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-stone-100 transition-all cursor-pointer"
    >
      <LogOut className="w-4 h-4" />
      Se déconnecter
    </button>
  );

  if (authLoading) {
    return (
      <AccessGate
        icon={<RefreshCw className="w-6 h-6 animate-spin text-amber-400" />}
        title="Chargement"
        message="Vérification de votre session en cours..."
      />
    );
  }

  // The dossier holds names, addresses and ID numbers, so nothing renders before
  // sign-in. firestore.rules enforces the same boundary server-side.
  if (!user) {
    return (
      <>
        <AccessGate
          icon={<Building2 className="w-6 h-6 text-amber-400" />}
          title="Gestion des Congés & RH"
          message="Cette application contient des données RH confidentielles. Veuillez vous connecter pour continuer."
          action={
            <button
              onClick={() => setShowAuthModal(true)}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              Connexion
            </button>
          }
        />
        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      </>
    );
  }

  if (profileError) {
    return (
      <AccessGate
        icon={<ShieldCheck className="w-6 h-6 text-amber-400" />}
        title="Profil indisponible"
        message="Votre profil n'a pas pu être chargé depuis Cloud Firestore. Vos droits d'accès sont donc inconnus. Vérifiez votre connexion puis réessayez."
        action={
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => void refreshProfile()}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Réessayer
            </button>
            {signOutButton}
          </div>
        }
      />
    );
  }

  if (isPending) {
    return (
      <AccessGate
        icon={<Clock className="w-6 h-6 text-amber-400" />}
        title="Compte en attente de validation"
        message="Votre compte a bien été créé. Un administrateur doit vous attribuer un rôle avant que vous puissiez accéder aux données RH."
        action={signOutButton}
      />
    );
  }

  if (!isStaff) {
    return (
      <AccessGate
        icon={<ShieldCheck className="w-6 h-6 text-amber-400" />}
        title="Accès non autorisé"
        message="Votre compte n'a pas les droits nécessaires pour consulter les données RH. Contactez un administrateur."
        action={signOutButton}
      />
    );
  }

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
                  Règles Sécurité Durcies
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
                  <p className="text-[10px] text-emerald-600 font-semibold">Connecté ({dbUser?.role || 'Utilisateur'})</p>
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
              <strong>Base Cloud Firestore Active:</strong> Toutes les données (Employés, Registre des Congés, Audit) sont centralisées et synchronisées entre tous vos appareils connectés.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-indigo-800/80 px-2 py-0.5 rounded text-[11px] border border-indigo-700/60 font-mono">
              Base: Cloud Firestore
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
            <span>Gestion RH, Calculateur de Solde & Base Cloud Firestore Centralisée</span>
          </div>
          <span className="font-mono text-stone-400">Google AI Studio • Cloud Firestore</span>
        </div>
      </footer>
    </div>
  );
}
