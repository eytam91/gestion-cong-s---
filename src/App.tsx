import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  AlertCircle,
  Clock,
  Lock,
} from 'lucide-react';
import { Employee, LeaveRecord } from '@/types';
import { DashboardOverview } from '@/features/dashboard/DashboardOverview';
import { EmployeeManager } from '@/features/employees/EmployeeManager';
import { LedgerHistory } from '@/features/leave/LedgerHistory';
import { LeaveLedgerModal } from '@/features/leave/LeaveLedgerModal';
import { AuditLogsManager } from '@/features/audit/AuditLogsManager';
import { UserManager } from '@/features/users/UserManager';
import { AuthModal } from '@/features/auth/AuthModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { registerDeviceConnection, addActivityLog } from '@/features/audit/auditLogger';
import { useAuth } from '@/features/auth/AuthContext';
import {
  fetchAllData,
  fetchEmployees,
  saveEmployee,
  batchSaveEmployees,
  updateEmployeeDoc,
  deleteEmployeeDoc,
  saveLeaveRecord,
  deleteLeaveRecordDoc,
  clearAllFirestoreData,
} from '@/services/firestoreService';

type Tab = 'dashboard' | 'employees' | 'ledger' | 'audit' | 'users';

/** Full-screen states shown instead of the app when the viewer has no access. */
const Gate: React.FC<{
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
  const { user, dbUser, logout, isAdmin, isStaff, isPending, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [modalInitialEmployeeId, setModalInitialEmployeeId] = useState<string | undefined>();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  const actor = useMemo(
    () => ({ uid: dbUser?.uid ?? '', name: dbUser?.name ?? 'Inconnu' }),
    [dbUser],
  );

  useEffect(() => {
    registerDeviceConnection();
  }, []);

  /**
   * Audit writes must never take down the action they describe, so a failed log
   * is reported but swallowed.
   */
  const log = useCallback(
    async (entry: Parameters<typeof addActivityLog>[0]) => {
      try {
        await addActivityLog(entry, actor);
      } catch (err) {
        console.error("Échec de l'écriture du journal d'audit:", err);
      }
    },
    [actor],
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setDataError(null);
    try {
      const { employees: emps, leaveRecords: leaves } = await fetchAllData();
      setEmployees(emps);
      setLeaveRecords(leaves);
    } catch (err) {
      console.error('Failed to load data from Firestore:', err);
      setDataError(
        'Impossible de charger les données depuis Cloud Firestore. Vérifiez votre connexion puis réessayez.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isStaff) {
      void loadData();
    } else {
      setIsLoading(false);
    }
  }, [isStaff, loadData]);

  const handleClearAllData = async () => {
    setShowClearConfirm(false);
    setDataError(null);
    try {
      await clearAllFirestoreData();
      setEmployees([]);
      setLeaveRecords([]);
      await log({
        action: 'DATA_CLEARED',
        actionLabel: 'Nettoyage Base',
        details: 'Suppression de tous les employés et congés dans Cloud Firestore.',
      });
    } catch (err) {
      console.error('Clear failed:', err);
      setDataError('La suppression des données a échoué.');
    }
  };

  const handleBatchImportEmployees = async (importedEmployees: Employee[]) => {
    setDataError(null);
    try {
      await batchSaveEmployees(importedEmployees);
      setEmployees(await fetchEmployees());
      await log({
        action: 'EMPLOYEES_IMPORTED',
        actionLabel: 'Import Multiple Employés',
        details: `Import: ${importedEmployees.length} employés synchronisés dans Cloud Firestore.`,
      });
    } catch (err) {
      console.error('Failed to batch import employees:', err);
      setDataError("L'import des employés a échoué. Aucune donnée n'a été modifiée.");
    }
  };

  const handleAddEmployee = async (newEmpData: Omit<Employee, 'id' | 'createdAt'>) => {
    const newEmp: Employee = {
      ...newEmpData,
      id: `emp-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    setDataError(null);
    try {
      const saved = await saveEmployee(newEmp);
      setEmployees((prev) => [saved, ...prev]);
      await log({
        action: 'EMPLOYEE_CREATED',
        actionLabel: 'Création Employé',
        details: `Ajout de l'employé ${saved.name} (${saved.contractType}).`,
        targetId: saved.id,
      });
    } catch (err) {
      console.error('Failed to add employee:', err);
      setDataError("L'ajout de l'employé a échoué.");
    }
  };

  const handleUpdateEmployee = async (updatedEmp: Employee) => {
    setDataError(null);
    try {
      const saved = await updateEmployeeDoc(updatedEmp);
      setEmployees((prev) => prev.map((emp) => (emp.id === saved.id ? saved : emp)));
      await log({
        action: 'EMPLOYEE_UPDATED',
        actionLabel: 'Modification Employé',
        details: `Mise à jour de ${saved.name}.`,
        targetId: saved.id,
      });
    } catch (err) {
      console.error('Failed to update employee:', err);
      setDataError("La mise à jour de l'employé a échoué.");
    }
  };

  const handleConfirmDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    const target = employeeToDelete;
    setEmployeeToDelete(null);
    setDataError(null);

    try {
      await deleteEmployeeDoc(target.id);
      setEmployees((prev) => prev.filter((emp) => emp.id !== target.id));
      setLeaveRecords((prev) => prev.filter((r) => r.employeeId !== target.id));
      await log({
        action: 'EMPLOYEE_DELETED',
        actionLabel: 'Suppression Employé',
        details: `Suppression de l'employé ${target.name} et de ses congés associés.`,
        targetId: target.id,
      });
    } catch (err) {
      console.error('Failed to delete employee:', err);
      setDataError("La suppression de l'employé a échoué.");
    }
  };

  const handleAddLeaveRecord = async (recordData: Omit<LeaveRecord, 'id' | 'createdAt'>) => {
    const newRecord: LeaveRecord = {
      ...recordData,
      id: `rec-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    setDataError(null);
    try {
      const saved = await saveLeaveRecord(newRecord);
      setLeaveRecords((prev) => [saved, ...prev]);
      const targetEmp = employees.find((e) => e.id === recordData.employeeId);
      await log({
        action: 'LEAVE_ADDED',
        actionLabel: 'Saisie de Congé',
        details: `Enregistrement de ${saved.daysCount}j pour ${targetEmp?.name || recordData.employeeId} (${saved.startDate} -> ${saved.endDate}).`,
        targetId: saved.id,
      });
    } catch (err) {
      console.error('Failed to add leave record:', err);
      setDataError("L'enregistrement du congé a échoué.");
    }
  };

  const handleDeleteLeaveRecord = async (id: string) => {
    const recToDelete = leaveRecords.find((r) => r.id === id);
    setDataError(null);
    try {
      await deleteLeaveRecordDoc(id);
      setLeaveRecords((prev) => prev.filter((r) => r.id !== id));
      await log({
        action: 'LEAVE_DELETED',
        actionLabel: 'Annulation Congé',
        details: `Annulation du congé ${id} (${recToDelete?.daysCount ?? 0} jours).`,
        targetId: id,
      });
    } catch (err) {
      console.error('Failed to delete leave record:', err);
      setDataError("L'annulation du congé a échoué.");
    }
  };

  const handleOpenLeaveModal = (empId?: string) => {
    setModalInitialEmployeeId(empId);
    setIsLeaveModalOpen(true);
  };

  if (authLoading) {
    return (
      <Gate
        icon={<RefreshCw className="w-6 h-6 animate-spin text-amber-400" />}
        title="Chargement"
        message="Vérification de votre session en cours..."
      />
    );
  }

  if (!user) {
    return (
      <>
        <Gate
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

  if (isPending) {
    return (
      <Gate
        icon={<Clock className="w-6 h-6 text-amber-400" />}
        title="Compte en attente de validation"
        message="Votre compte a bien été créé. Un administrateur doit vous attribuer un rôle avant que vous puissiez accéder aux données RH."
        action={
          <button
            onClick={() => void logout()}
            className="inline-flex items-center gap-1.5 text-stone-600 hover:text-stone-900 text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-stone-100 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Se déconnecter
          </button>
        }
      />
    );
  }

  if (!isStaff) {
    return (
      <Gate
        icon={<Lock className="w-6 h-6 text-amber-400" />}
        title="Accès non autorisé"
        message="Votre compte n'a pas les droits nécessaires pour consulter les données RH. Contactez un administrateur."
        action={
          <button
            onClick={() => void logout()}
            className="inline-flex items-center gap-1.5 text-stone-600 hover:text-stone-900 text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-stone-100 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Se déconnecter
          </button>
        }
      />
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: 'dashboard', label: 'Tableau de Bord', icon: <LayoutDashboard className="w-4 h-4" /> },
    {
      id: 'employees',
      label: `Employés (${employees.length})`,
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'ledger',
      label: `Journal des Congés (${leaveRecords.length})`,
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
              onClick={() => void loadData()}
              title="Rafraîchir les données Cloud Firestore"
              aria-label="Rafraîchir les données"
              className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-600' : ''}`} />
            </button>

            <button
              id="btn-quick-add-absence"
              onClick={() => handleOpenLeaveModal()}
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
        {dataError && (
          <div
            role="alert"
            className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-700 text-xs font-medium"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <p className="leading-relaxed">{dataError}</p>
          </div>
        )}

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
                onSelectEmployee={() => setActiveTab('employees')}
              />
            )}

            {activeTab === 'employees' && (
              <EmployeeManager
                employees={employees}
                leaveRecords={leaveRecords}
                onAddEmployee={handleAddEmployee}
                onUpdateEmployee={handleUpdateEmployee}
                onDeleteEmployee={(id) =>
                  setEmployeeToDelete(employees.find((e) => e.id === id) ?? null)
                }
                onBatchImportEmployees={handleBatchImportEmployees}
                onOpenLeaveModal={handleOpenLeaveModal}
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
                onClearAllData={isAdmin ? () => setShowClearConfirm(true) : undefined}
                employeeCount={employees.length}
                leaveRecordCount={leaveRecords.length}
              />
            )}

            {activeTab === 'users' && isAdmin && <UserManager />}
          </>
        )}
      </main>

      <LeaveLedgerModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        employees={employees}
        leaveRecords={leaveRecords}
        initialEmployeeId={modalInitialEmployeeId}
        onAddLeaveRecord={handleAddLeaveRecord}
      />

      {employeeToDelete && (
        <ConfirmModal
          isOpen
          type="danger"
          title={`Supprimer ${employeeToDelete.name} ?`}
          subtitle="Cette action est définitive."
          warningMessage="Tous les congés enregistrés pour cet employé seront également supprimés."
          confirmLabel="Oui, supprimer"
          cancelLabel="Annuler"
          summaryItems={[
            { label: 'Matricule', value: employeeToDelete.idNumber },
            { label: 'Nom', value: employeeToDelete.name },
            { label: 'Poste', value: employeeToDelete.position },
          ]}
          onConfirm={() => void handleConfirmDeleteEmployee()}
          onCancel={() => setEmployeeToDelete(null)}
        />
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
          { label: 'Employés supprimés', value: employees.length },
          { label: 'Congés supprimés', value: leaveRecords.length },
        ]}
        onConfirm={() => void handleClearAllData()}
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
