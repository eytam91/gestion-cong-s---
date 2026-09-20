import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  Database,
  FileText,
  Globe,
  LayoutDashboard,
  Lock,
  LogIn,
  LogOut,
  Plus,
  RefreshCw,
  ShieldCheck,
  User as UserIcon,
  Users,
} from 'lucide-react';
import { AccessGate } from '@/components/AccessGate';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { AuthModal } from '@/features/auth/AuthModal';
import { useAuth } from '@/features/auth/AuthContext';
import { registerDeviceConnection } from '@/features/audit/auditLogger';
import { useHrData } from '@/hooks/useHrData';

// Each tab is its own chunk: recharts and xlsx are heavy and most sessions
// never open the screens that need them.
const DashboardOverview = lazy(() =>
  import('@/features/dashboard/DashboardOverview').then((m) => ({ default: m.DashboardOverview })),
);
const EmployeeManager = lazy(() =>
  import('@/features/employees/EmployeeManager').then((m) => ({ default: m.EmployeeManager })),
);
const LedgerHistory = lazy(() =>
  import('@/features/leave/LedgerHistory').then((m) => ({ default: m.LedgerHistory })),
);
const AuditLogsManager = lazy(() =>
  import('@/features/audit/AuditLogsManager').then((m) => ({ default: m.AuditLogsManager })),
);
const UserManager = lazy(() =>
  import('@/features/users/UserManager').then((m) => ({ default: m.UserManager })),
);
const LeaveLedgerModal = lazy(() =>
  import('@/features/leave/LeaveLedgerModal').then((m) => ({ default: m.LeaveLedgerModal })),
);

type Tab = 'dashboard' | 'employees' | 'ledger' | 'audit' | 'users';

const Spinner: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-3 text-stone-500">
    <RefreshCw className="w-8 h-8 animate-spin text-amber-600" />
    <p className="text-sm font-medium">{label}</p>
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

  const actor = useMemo(
    () => ({ uid: dbUser?.uid ?? '', name: dbUser?.name ?? 'Inconnu' }),
    [dbUser],
  );
  const data = useHrData(actor, isStaff);

  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [modalInitialEmployeeId, setModalInitialEmployeeId] = useState<string | undefined>();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Records this browser in the device list the audit screen reads back.
  useEffect(() => {
    registerDeviceConnection();
  }, []);

  const openLeaveModal = (employeeId?: string) => {
    setModalInitialEmployeeId(employeeId);
    setIsLeaveModalOpen(true);
  };

  if (authLoading) {
    return (
      <AccessGate
        icon={<RefreshCw className="w-6 h-6 animate-spin text-amber-400" />}
        title="Chargement"
        message="Vérification de votre session en cours..."
      />
    );
  }

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

  const signOutButton = (
    <button
      onClick={() => void logout()}
      className="inline-flex items-center gap-1.5 text-stone-600 hover:text-stone-900 text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-stone-100 transition-all cursor-pointer"
    >
      <LogOut className="w-4 h-4" />
      Se déconnecter
    </button>
  );

  if (profileError) {
    return (
      <AccessGate
        icon={<AlertCircle className="w-6 h-6 text-amber-400" />}
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
        icon={<Lock className="w-6 h-6 text-amber-400" />}
        title="Accès non autorisé"
        message="Votre compte n'a pas les droits nécessaires pour consulter les données RH. Contactez un administrateur."
        action={signOutButton}
      />
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: 'dashboard', label: 'Tableau de Bord', icon: <LayoutDashboard className="w-4 h-4" /> },
    {
      id: 'employees',
      label: `Employés (${data.employees.length})`,
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'ledger',
      label: `Journal des Congés (${data.leaveRecords.length})`,
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: 'audit',
      label: 'Audit & Appareils',
      icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />,
    },
    {
      id: 'users',
      label: 'Utilisateurs',
      icon: <UserIcon className="w-4 h-4 text-indigo-600" />,
      adminOnly: true,
    },
  ];

  return (
    <div className="min-h-screen bg-stone-100/70 text-stone-800 flex flex-col justify-between font-sans selection:bg-amber-100 selection:text-amber-900">
      <header className="border-b border-stone-200/80 bg-white sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-stone-900 text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <span className="font-bold text-stone-900 text-base tracking-tight">
                Gestion des Congés & RH
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center gap-1 text-2xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono font-bold border border-indigo-200">
                  <Database className="w-3 h-3 text-indigo-600" />
                  Cloud Firestore
                </span>
                <span className="hidden md:inline-flex items-center gap-1 text-2xs bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-mono">
                  <Globe className="w-3 h-3 text-emerald-600" />
                  Multi-Appareils Synchronisés
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => void data.reload()}
              title="Rafraîchir les données Cloud Firestore"
              aria-label="Rafraîchir les données"
              className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw
                className={`w-4 h-4 ${data.isLoading ? 'animate-spin text-amber-600' : ''}`}
              />
            </button>

            <button
              id="btn-quick-add-absence"
              onClick={() => openLeaveModal()}
              className="inline-flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Nouveau Congé</span>
            </button>

            <div className="flex items-center gap-2 bg-stone-100 p-1.5 rounded-xl border border-stone-200">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                {(dbUser?.name || user.email || 'U')[0].toUpperCase()}
              </div>
              <div className="hidden lg:block text-left pr-1">
                <p className="text-2xs font-bold text-stone-900 leading-tight truncate max-w-[120px]">
                  {dbUser?.name || user.email}
                </p>
                <p className="text-[10px] text-emerald-600 font-semibold">
                  Connecté ({dbUser?.role})
                </p>
              </div>
              <button
                onClick={() => void logout()}
                title="Se déconnecter"
                aria-label="Se déconnecter"
                className="p-1.5 text-stone-500 hover:text-red-600 rounded-lg hover:bg-stone-200 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <nav
          className="border-t border-stone-100 bg-stone-50/50"
          aria-label="Navigation principale"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto">
            {tabs
              .filter((tab) => !tab.adminOnly || isAdmin)
              .map((tab) => (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
                    activeTab === tab.id
                      ? 'border-stone-900 text-stone-900 bg-white'
                      : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-stone-100/50'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        {data.error && (
          <div
            role="alert"
            className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-700 text-xs font-medium"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <p className="leading-relaxed">{data.error}</p>
          </div>
        )}

        {data.isLoading ? (
          <Spinner label="Chargement des données depuis Cloud Firestore..." />
        ) : (
          <Suspense fallback={<Spinner label="Chargement de la vue..." />}>
            {activeTab === 'dashboard' && (
              <DashboardOverview
                employees={data.employees}
                leaveRecords={data.leaveRecords}
                onOpenLeaveModal={openLeaveModal}
                onSelectEmployee={() => setActiveTab('employees')}
              />
            )}

            {activeTab === 'employees' && (
              <EmployeeManager
                employees={data.employees}
                leaveRecords={data.leaveRecords}
                onAddEmployee={data.addEmployee}
                onUpdateEmployee={data.updateEmployee}
                onDeleteEmployee={(id) => {
                  // EmployeeManager already confirms; a second dialog here would
                  // ask the same question twice.
                  const target = data.employees.find((e) => e.id === id);
                  if (target) void data.deleteEmployee(target);
                }}
                onBatchImportEmployees={data.importEmployees}
                onOpenLeaveModal={openLeaveModal}
                canDelete={isAdmin}
              />
            )}

            {activeTab === 'ledger' && (
              <LedgerHistory
                employees={data.employees}
                leaveRecords={data.leaveRecords}
                onDeleteLeaveRecord={data.deleteLeaveRecord}
                onOpenLeaveModal={openLeaveModal}
              />
            )}

            {activeTab === 'audit' && (
              <AuditLogsManager
                onClearAllData={isAdmin ? () => setShowClearConfirm(true) : undefined}
                employeeCount={data.employees.length}
                leaveRecordCount={data.leaveRecords.length}
              />
            )}

            {activeTab === 'users' && isAdmin && <UserManager />}
          </Suspense>
        )}
      </main>

      {isLeaveModalOpen && (
        <Suspense fallback={null}>
          <LeaveLedgerModal
            isOpen={isLeaveModalOpen}
            onClose={() => setIsLeaveModalOpen(false)}
            employees={data.employees}
            leaveRecords={data.leaveRecords}
            initialEmployeeId={modalInitialEmployeeId}
            onAddLeaveRecord={data.addLeaveRecord}
          />
        </Suspense>
      )}

      <ConfirmModal
        isOpen={showClearConfirm}
        type="danger"
        title="Vider toute la base de données ?"
        subtitle="Tous les employés et tous les congés seront supprimés de Cloud Firestore."
        warningMessage="Cette action est irréversible et affecte tous les utilisateurs connectés."
        confirmLabel="Oui, tout supprimer"
        cancelLabel="Annuler"
        summaryItems={[
          { label: 'Employés supprimés', value: data.employees.length },
          { label: 'Congés supprimés', value: data.leaveRecords.length },
        ]}
        onConfirm={() => {
          setShowClearConfirm(false);
          void data.clearAll();
        }}
        onCancel={() => setShowClearConfirm(false)}
      />

      <footer className="border-t border-stone-200 bg-white text-xs text-stone-500 py-4 px-6 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Gestion RH, Calculateur de Solde & Base Cloud Firestore Centralisée</span>
          </div>
          <span className="font-mono text-stone-400">Cloud Firestore</span>
        </div>
      </footer>
    </div>
  );
}
