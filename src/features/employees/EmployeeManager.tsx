import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Briefcase,
  Building2,
  Calendar,
  Download,
  FileSpreadsheet,
  Hash,
  UserPlus,
  Users,
} from 'lucide-react';
import { ContractType, Employee, EmployeeStatus, LeaveRecord } from '@/types';
import { calculateEmployeeStats } from '@/features/leave/vacationCalc';
import { EmployeeImportModal } from '@/features/employees/EmployeeImportModal';
import { EmployeeCard } from '@/features/employees/EmployeeCard';
import { EmployeeFilters } from '@/features/employees/EmployeeFilters';
import { EmployeeFormModal } from '@/features/employees/EmployeeFormModal';
import { EmployeeDetailModal } from '@/features/employees/EmployeeDetailModal';
import { useEmployeeForm } from '@/features/employees/useEmployeeForm';
import { exportEmployeesToCsv } from '@/features/employees/employeeCsvExport';
import { exportEmployeesToExcel } from '@/features/employees/excelImportExport';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Pagination } from '@/components/ui/Pagination';

interface EmployeeManagerProps {
  employees: Employee[];
  leaveRecords: LeaveRecord[];
  onAddEmployee: (employee: Omit<Employee, 'id' | 'createdAt'>) => void;
  onUpdateEmployee: (employee: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onBatchImportEmployees: (employees: Employee[]) => Promise<void>;
  onOpenLeaveModal: (employeeId: string) => void;
  /** Deleting an employee cascades to their leave history, so it is admin-only. */
  canDelete?: boolean;
}

const PAGE_SIZE = 25;

export const EmployeeManager: React.FC<EmployeeManagerProps> = ({
  employees,
  leaveRecords,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onBatchImportEmployees,
  onOpenLeaveModal,
  canDelete = true,
}) => {
  const form = useEmployeeForm(employees);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | EmployeeStatus>('ALL');
  const [contractFilter, setContractFilter] = useState<'ALL' | ContractType>('ALL');
  const [detailEmployeeId, setDetailEmployeeId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const filteredEmployees = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return employees.filter((emp) => {
      const matchesSearch =
        !term ||
        [emp.name, emp.idNumber, emp.matriculeGL, emp.position].some((field) =>
          (field || '').toLowerCase().includes(term),
        );
      const matchesStatus = statusFilter === 'ALL' || emp.status === statusFilter;
      const matchesContract = contractFilter === 'ALL' || emp.contractType === contractFilter;
      return matchesSearch && matchesStatus && matchesContract;
    });
  }, [employees, searchTerm, statusFilter, contractFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredEmployees.length / PAGE_SIZE));
  // Narrowing the filters can strand the view on a page that no longer exists.
  const currentPage = Math.min(page, pageCount);
  const visibleEmployees = filteredEmployees.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, contractFilter]);

  const counts = useMemo(
    () => ({
      local: employees.filter((e) => e.status === 'LOCAL').length,
      expat: employees.filter((e) => e.status === 'EXPAT').length,
      typeA: employees.filter((e) => e.contractType === 'TYPE_A').length,
      typeB: employees.filter((e) => e.contractType === 'TYPE_B').length,
    }),
    [employees],
  );

  const detailEmployee = employees.find((e) => e.id === detailEmployeeId) ?? null;

  const handleRequestCloseForm = () => {
    if (form.isDirty) {
      setShowDiscardConfirm(true);
    } else {
      form.close();
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.validate()) {
      setShowSaveConfirm(true);
    }
  };

  const handleExecuteSave = () => {
    setShowSaveConfirm(false);
    const { values, editing } = form;
    const payload = {
      idNumber: values.idNumber.trim(),
      matriculeGL: values.matriculeGL.trim(),
      nationality: values.nationality.trim(),
      name: values.name.trim(),
      position: values.position.trim(),
      status: values.status,
      hireDate: values.hireDate,
      contractType: values.contractType,
    };

    if (editing) {
      onUpdateEmployee({ ...editing, ...payload });
    } else {
      onAddEmployee(payload);
    }
    form.close();
  };

  const runExport = (exporter: () => void) => {
    setExportError(null);
    try {
      exporter();
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "L'export a échoué.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <span>Gestion des Effectifs & Statuts RH</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 font-mono font-bold">
              {employees.length} employé(s)
            </span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Renseignez N° Matricule, Fonction, Statut (Personnel Local vs Expatrié) et Cycle de
            Congés avec validation stricte.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => runExport(() => exportEmployeesToExcel(employees, leaveRecords))}
            className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 text-xs font-bold px-3 py-2.5 rounded-xl border border-emerald-300 shadow-2xs transition-all cursor-pointer active:scale-98"
            title="Exporter l'ensemble de l'effectif avec soldes et calculs au format Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Exporter Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => runExport(() => exportEmployeesToCsv(employees, leaveRecords))}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-stone-50 text-stone-800 text-xs font-bold px-3 py-2.5 rounded-xl border border-stone-200 shadow-2xs transition-all cursor-pointer active:scale-98"
          >
            <Download className="w-4 h-4 text-stone-600" />
            <span>Exporter CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer active:scale-98"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Importer Excel / CSV</span>
          </button>

          <button
            id="btn-add-employee-modal"
            onClick={form.openForCreate}
            className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer active:scale-98"
          >
            <UserPlus className="w-4 h-4" />
            <span>Ajouter un Employé</span>
          </button>
        </div>
      </div>

      {exportError && (
        <div
          role="alert"
          className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium"
        >
          {exportError}
        </div>
      )}

      <EmployeeFormModal
        form={form}
        onRequestClose={handleRequestCloseForm}
        onSubmit={handleFormSubmit}
      />

      <ConfirmModal
        isOpen={showSaveConfirm}
        title={
          form.editing
            ? "Enregistrer les modifications de l'employé ?"
            : "Confirmer la création de l'employé ?"
        }
        subtitle={
          form.editing
            ? 'Voulez-vous enregistrer les modifications apportées à la fiche de cet employé dans Cloud Firestore ?'
            : "Veuillez vérifier les informations ci-dessous avant d'enregistrer le nouvel employé dans la base de données."
        }
        type="save"
        confirmLabel={form.editing ? 'Confirmer la mise à jour' : 'Confirmer la création'}
        cancelLabel="Continuer la modification"
        summaryItems={[
          {
            label: 'N° Matricule',
            value: form.values.idNumber,
            icon: <Hash className="w-3.5 h-3.5 text-stone-400" />,
          },
          {
            label: 'Nom & Prénom',
            value: form.values.name,
            icon: <Users className="w-3.5 h-3.5 text-stone-400" />,
          },
          {
            label: 'Poste / Fonction',
            value: form.values.position,
            icon: <Briefcase className="w-3.5 h-3.5 text-stone-400" />,
          },
          {
            label: 'Statut Contractuel',
            value: form.values.status === 'EXPAT' ? 'Expatrié (EXPAT)' : 'Personnel Local (LOCAL)',
            icon: <Building2 className="w-3.5 h-3.5 text-stone-400" />,
          },
          {
            label: "Date d'Embauche",
            value: new Date(form.values.hireDate).toLocaleDateString('fr-FR'),
            icon: <Calendar className="w-3.5 h-3.5 text-stone-400" />,
          },
          {
            label: 'Cycle de Congés',
            value:
              form.values.contractType === 'TYPE_A'
                ? 'Type A (30 jours / 6 mois)'
                : 'Type B (30 jours / 12 mois)',
            icon: <BadgeCheck className="w-3.5 h-3.5 text-stone-400" />,
          },
        ]}
        onConfirm={handleExecuteSave}
        onCancel={() => setShowSaveConfirm(false)}
      />

      <ConfirmModal
        isOpen={showDiscardConfirm}
        title="Modifications non enregistrées"
        subtitle="Vous avez des informations saisies ou modifiées dans le formulaire."
        type="warning"
        confirmLabel="Quitter sans enregistrer"
        cancelLabel="Continuer la saisie"
        warningMessage="Toutes les modifications apportées depuis l'ouverture du formulaire seront perdues si vous quittez maintenant."
        onConfirm={() => {
          setShowDiscardConfirm(false);
          form.close();
        }}
        onCancel={() => setShowDiscardConfirm(false)}
      />

      {employeeToDelete && (
        <ConfirmModal
          isOpen
          title={`Supprimer définitivement ${employeeToDelete.name} ?`}
          subtitle="Cette action supprimera également tout l'historique des congés associés à cet employé."
          type="danger"
          confirmLabel="Oui, supprimer définitivement"
          cancelLabel="Annuler"
          warningMessage="Attention : Cette suppression sera répercutée immédiatement dans Cloud Firestore et tous les appareils connectés."
          summaryItems={[
            { label: 'N° Matricule', value: employeeToDelete.idNumber || 'SANS-MAT' },
            { label: 'Nom & Prénom', value: employeeToDelete.name },
            { label: 'Poste', value: employeeToDelete.position || 'Collaborateur' },
            { label: 'Statut', value: employeeToDelete.status },
          ]}
          onConfirm={() => {
            const id = employeeToDelete.id;
            setEmployeeToDelete(null);
            onDeleteEmployee(id);
          }}
          onCancel={() => setEmployeeToDelete(null)}
        />
      )}

      <EmployeeFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        contractFilter={contractFilter}
        setContractFilter={setContractFilter}
        totalCount={employees.length}
        countLocal={counts.local}
        countExpat={counts.expat}
        countTypeA={counts.typeA}
        countTypeB={counts.typeB}
      />

      {filteredEmployees.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center mx-auto">
            <Users className="w-7 h-7 text-amber-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900">
              {employees.length === 0
                ? 'Aucun employé enregistré pour le moment'
                : 'Aucun employé ne correspond aux filtres'}
            </h3>
            <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
              {employees.length === 0
                ? 'Commencez par ajouter votre premier collaborateur ou importez directement une liste complète depuis un fichier Excel / CSV.'
                : 'Essayez de modifier votre recherche ou vos filtres de statut.'}
            </p>
          </div>

          {employees.length === 0 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={form.openForCreate}
                className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-amber-400" />
                <span>Créer le Premier Employé</span>
              </button>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-950 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-amber-700" />
                <span>Importer Liste Excel / CSV</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleEmployees.map((emp) => (
            <EmployeeCard
              key={emp.id}
              employee={emp}
              stats={calculateEmployeeStats(emp, leaveRecords)}
              canDelete={canDelete}
              onEdit={form.openForEdit}
              onDelete={setEmployeeToDelete}
              onShowHistory={setDetailEmployeeId}
              onAddLeave={onOpenLeaveModal}
            />
          ))}
        </div>
      )}

      <Pagination
        page={currentPage}
        pageCount={pageCount}
        pageSize={PAGE_SIZE}
        totalItems={filteredEmployees.length}
        onPageChange={setPage}
        label="Pagination des employés"
      />

      {detailEmployee && (
        <EmployeeDetailModal
          employee={detailEmployee}
          stats={calculateEmployeeStats(detailEmployee, leaveRecords)}
          records={leaveRecords.filter((r) => r.employeeId === detailEmployee.id)}
          onClose={() => setDetailEmployeeId(null)}
          onAddLeave={onOpenLeaveModal}
        />
      )}

      <EmployeeImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportEmployees={onBatchImportEmployees}
        existingEmployees={employees}
      />
    </div>
  );
};
