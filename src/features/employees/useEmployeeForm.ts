import { useCallback, useState } from 'react';
import { ContractType, Employee, EmployeeStatus } from '@/types';

export interface EmployeeFormValues {
  idNumber: string;
  matriculeGL: string;
  nationality: string;
  name: string;
  position: string;
  status: EmployeeStatus;
  hireDate: string;
  contractType: ContractType;
}

export type EmployeeFormErrors = Partial<Record<keyof EmployeeFormValues, string>>;

const today = () => new Date().toISOString().split('T')[0];

export function emptyValues(suggestedNumber: number): EmployeeFormValues {
  const seq = String(suggestedNumber).padStart(4, '0');
  return {
    idNumber: `MAT-${seq}`,
    matriculeGL: `GL-${seq}`,
    nationality: '',
    name: '',
    position: '',
    status: 'LOCAL',
    hireDate: today(),
    contractType: 'TYPE_A',
  };
}

export function valuesOf(employee: Employee): EmployeeFormValues {
  return {
    idNumber: employee.idNumber || '',
    matriculeGL: employee.matriculeGL || '',
    nationality: employee.nationality || '',
    name: employee.name,
    position: employee.position || '',
    status: employee.status || 'LOCAL',
    hireDate: employee.hireDate,
    contractType: employee.contractType,
  };
}

/**
 * Validates a form submission. Exported separately from the hook so the rules
 * can be tested without mounting a component.
 */
export function validateEmployeeForm(
  values: EmployeeFormValues,
  employees: Employee[],
  editingId?: string,
): EmployeeFormErrors {
  const errors: EmployeeFormErrors = {};

  const name = values.name.trim();
  if (!name) {
    errors.name = "Le nom et prénom de l'employé sont obligatoires.";
  } else if (name.length < 2) {
    errors.name = 'Le nom doit comporter au moins 2 caractères.';
  }

  const idNumber = values.idNumber.trim();
  if (!idNumber) {
    errors.idNumber = 'Le N° Matricule / ID unique est obligatoire.';
  } else if (idNumber.length < 2) {
    errors.idNumber = 'Le N° Matricule doit comporter au moins 2 caractères (ex: MAT-001).';
  } else if (
    employees.some(
      (emp) =>
        emp.idNumber &&
        emp.idNumber.toLowerCase() === idNumber.toLowerCase() &&
        emp.id !== editingId,
    )
  ) {
    errors.idNumber = `Le matricule "${idNumber}" est déjà attribué à un autre employé.`;
  }

  const position = values.position.trim();
  if (!position) {
    errors.position = "L'intitulé du poste / fonction est obligatoire.";
  } else if (position.length < 2) {
    errors.position = "L'intitulé du poste doit comporter au moins 2 caractères.";
  }

  if (!values.hireDate) {
    errors.hireDate = "La date d'embauche est obligatoire.";
  } else {
    const parsed = new Date(values.hireDate);
    if (isNaN(parsed.getTime())) {
      errors.hireDate = "Date d'embauche invalide (format AAAA-MM-JJ requis).";
    } else {
      const year = parsed.getFullYear();
      if (year < 1970 || year > 2099) {
        errors.hireDate = 'Veuillez saisir une année valide entre 1970 et 2099.';
      }
    }
  }

  if (values.status !== 'LOCAL' && values.status !== 'EXPAT') {
    errors.status = 'Veuillez sélectionner un statut contractuel valide (LOCAL ou EXPAT).';
  }
  if (values.contractType !== 'TYPE_A' && values.contractType !== 'TYPE_B') {
    errors.contractType = 'Veuillez sélectionner un cycle de congés valide (Type A ou Type B).';
  }

  return errors;
}

/** The four fields the progress indicator counts. */
export function fieldValidity(values: EmployeeFormValues) {
  const isNameValid = values.name.trim().length >= 2;
  const isIdValid = values.idNumber.trim().length >= 2;
  const isPositionValid = values.position.trim().length >= 2;
  const isHireDateValid = Boolean(values.hireDate && !isNaN(new Date(values.hireDate).getTime()));
  const validCount = [isNameValid, isIdValid, isPositionValid, isHireDateValid].filter(
    Boolean,
  ).length;

  return { isNameValid, isIdValid, isPositionValid, isHireDateValid, validCount };
}

export function isFormDirty(values: EmployeeFormValues, editing: Employee | null): boolean {
  if (editing) {
    const original = valuesOf(editing);
    return (Object.keys(values) as (keyof EmployeeFormValues)[]).some(
      (key) => String(values[key]).trim() !== String(original[key]).trim(),
    );
  }
  return Boolean(values.name.trim() || values.position.trim() || values.nationality.trim());
}

export function useEmployeeForm(employees: Employee[]) {
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [values, setValues] = useState<EmployeeFormValues>(() => emptyValues(1));
  const [errors, setErrors] = useState<EmployeeFormErrors>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const setField = useCallback(
    <K extends keyof EmployeeFormValues>(key: K, value: EmployeeFormValues[K]) => {
      setValues((prev) => ({ ...prev, [key]: value }));
      // Typing in a field is the user answering its error, so drop it immediately.
      setErrors((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [],
  );

  const openForCreate = useCallback(() => {
    setEditing(null);
    setValues(emptyValues(employees.length + 1));
    setErrors({});
    setHasAttemptedSubmit(false);
    setIsOpen(true);
  }, [employees.length]);

  const openForEdit = useCallback((employee: Employee) => {
    setEditing(employee);
    setValues(valuesOf(employee));
    setErrors({});
    setHasAttemptedSubmit(false);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setEditing(null);
    setErrors({});
    setHasAttemptedSubmit(false);
  }, []);

  const validate = useCallback(() => {
    const found = validateEmployeeForm(values, employees, editing?.id);
    setErrors(found);
    setHasAttemptedSubmit(true);
    return Object.keys(found).length === 0;
  }, [values, employees, editing]);

  return {
    isOpen,
    editing,
    values,
    errors,
    hasAttemptedSubmit,
    validity: fieldValidity(values),
    isDirty: isFormDirty(values, editing),
    setField,
    openForCreate,
    openForEdit,
    close,
    validate,
  };
}
