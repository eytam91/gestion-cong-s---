import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuditActor, Employee, LeaveRecord } from '@/types';
import { addActivityLog } from '@/features/audit/auditLogger';
import {
  batchSaveEmployees,
  clearAllFirestoreData,
  deleteEmployeeDoc,
  deleteLeaveRecordDoc,
  fetchAllData,
  fetchEmployees,
  saveEmployee,
  saveLeaveRecord,
  updateEmployeeDoc,
} from '@/services/firestoreService';

type LogEntry = Parameters<typeof addActivityLog>[0];

/**
 * Owns the employee and leave collections plus every mutation against them,
 * so screens deal in intent ("add this leave") rather than Firestore calls.
 *
 * `enabled` is false until the viewer is known to be staff; loading data for
 * someone without access would only produce permission errors.
 */
export function useHrData(actor: AuditActor, enabled: boolean) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** A failed audit write must not take down the action it describes. */
  const log = useCallback(
    async (entry: LogEntry) => {
      try {
        await addActivityLog(entry, actor);
      } catch (err) {
        console.error("Échec de l'écriture du journal d'audit:", err);
      }
    },
    [actor],
  );

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { employees: emps, leaveRecords: leaves } = await fetchAllData();
      setEmployees(emps);
      setLeaveRecords(leaves);
    } catch (err) {
      console.error('Failed to load data from Firestore:', err);
      setError(
        'Impossible de charger les données depuis Cloud Firestore. Vérifiez votre connexion puis réessayez.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      void reload();
    } else {
      setIsLoading(false);
    }
  }, [enabled, reload]);

  /** Runs a mutation, reporting failures as a user-facing message. */
  const mutate = useCallback(async (action: () => Promise<void>, failureMessage: string) => {
    setError(null);
    try {
      await action();
    } catch (err) {
      console.error(failureMessage, err);
      setError(failureMessage);
    }
  }, []);

  const addEmployee = useCallback(
    (data: Omit<Employee, 'id' | 'createdAt'>) =>
      mutate(async () => {
        const employee: Employee = {
          ...data,
          id: `emp-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        const saved = await saveEmployee(employee);
        setEmployees((prev) => [saved, ...prev]);
        await log({
          action: 'EMPLOYEE_CREATED',
          actionLabel: 'Création Employé',
          details: `Ajout de l'employé ${saved.name} (${saved.contractType}).`,
          targetId: saved.id,
        });
      }, "L'ajout de l'employé a échoué."),
    [mutate, log],
  );

  const updateEmployee = useCallback(
    (employee: Employee) =>
      mutate(async () => {
        const saved = await updateEmployeeDoc(employee);
        setEmployees((prev) => prev.map((e) => (e.id === saved.id ? saved : e)));
        await log({
          action: 'EMPLOYEE_UPDATED',
          actionLabel: 'Modification Employé',
          details: `Mise à jour de ${saved.name}.`,
          targetId: saved.id,
        });
      }, "La mise à jour de l'employé a échoué."),
    [mutate, log],
  );

  const deleteEmployee = useCallback(
    (employee: Employee) =>
      mutate(async () => {
        await deleteEmployeeDoc(employee.id);
        setEmployees((prev) => prev.filter((e) => e.id !== employee.id));
        setLeaveRecords((prev) => prev.filter((r) => r.employeeId !== employee.id));
        await log({
          action: 'EMPLOYEE_DELETED',
          actionLabel: 'Suppression Employé',
          details: `Suppression de l'employé ${employee.name} et de ses congés associés.`,
          targetId: employee.id,
        });
      }, "La suppression de l'employé a échoué."),
    [mutate, log],
  );

  const importEmployees = useCallback(
    (imported: Employee[]) =>
      mutate(async () => {
        await batchSaveEmployees(imported);
        setEmployees(await fetchEmployees());
        await log({
          action: 'EMPLOYEES_IMPORTED',
          actionLabel: 'Import Multiple Employés',
          details: `Import: ${imported.length} employés synchronisés dans Cloud Firestore.`,
        });
      }, "L'import des employés a échoué. Aucune donnée n'a été modifiée."),
    [mutate, log],
  );

  const addLeaveRecord = useCallback(
    (data: Omit<LeaveRecord, 'id' | 'createdAt'>) =>
      mutate(async () => {
        const record: LeaveRecord = {
          ...data,
          id: `rec-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        const saved = await saveLeaveRecord(record);
        setLeaveRecords((prev) => [saved, ...prev]);
        const target = employees.find((e) => e.id === data.employeeId);
        await log({
          action: 'LEAVE_ADDED',
          actionLabel: 'Saisie de Congé',
          details: `Enregistrement de ${saved.daysCount}j pour ${target?.name || data.employeeId} (${saved.startDate} -> ${saved.endDate}).`,
          targetId: saved.id,
        });
      }, "L'enregistrement du congé a échoué."),
    [mutate, log, employees],
  );

  const deleteLeaveRecord = useCallback(
    (id: string) =>
      mutate(async () => {
        const removedDays = leaveRecords.find((r) => r.id === id)?.daysCount ?? 0;
        await deleteLeaveRecordDoc(id);
        setLeaveRecords((prev) => prev.filter((r) => r.id !== id));
        await log({
          action: 'LEAVE_DELETED',
          actionLabel: 'Annulation Congé',
          details: `Annulation du congé ${id} (${removedDays} jours).`,
          targetId: id,
        });
      }, "L'annulation du congé a échoué."),
    [mutate, log, leaveRecords],
  );

  const clearAll = useCallback(
    () =>
      mutate(async () => {
        await clearAllFirestoreData();
        setEmployees([]);
        setLeaveRecords([]);
        await log({
          action: 'DATA_CLEARED',
          actionLabel: 'Nettoyage Base',
          details: 'Suppression de tous les employés et congés dans Cloud Firestore.',
        });
      }, 'La suppression des données a échoué.'),
    [mutate, log],
  );

  return useMemo(
    () => ({
      employees,
      leaveRecords,
      isLoading,
      error,
      reload,
      addEmployee,
      updateEmployee,
      deleteEmployee,
      importEmployees,
      addLeaveRecord,
      deleteLeaveRecord,
      clearAll,
    }),
    [
      employees,
      leaveRecords,
      isLoading,
      error,
      reload,
      addEmployee,
      updateEmployee,
      deleteEmployee,
      importEmployees,
      addLeaveRecord,
      deleteLeaveRecord,
      clearAll,
    ],
  );
}
