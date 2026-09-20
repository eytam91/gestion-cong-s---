import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BadgeCheck,
  Briefcase,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Edit3,
  Globe,
  Hash,
  UserPlus,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { TextField } from '@/components/ui/TextField';
import { ContractType, EmployeeStatus } from '@/types';
import type { useEmployeeForm } from '@/features/employees/useEmployeeForm';

type FormState = ReturnType<typeof useEmployeeForm>;

interface EmployeeFormModalProps {
  form: FormState;
  onRequestClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

const STATUS_OPTIONS: {
  value: EmployeeStatus;
  title: string;
  hint: string;
  icon: React.ReactNode;
  active: string;
  iconActive: string;
}[] = [
  {
    value: 'LOCAL',
    title: 'Personnel Local',
    hint: 'Contrat Local / National',
    icon: <Building2 className="w-4 h-4" />,
    active: 'bg-teal-50 border-teal-500 text-teal-950 font-bold ring-2 ring-teal-500/20',
    iconActive: 'bg-teal-600 text-white',
  },
  {
    value: 'EXPAT',
    title: 'Expatrié (EXPAT)',
    hint: 'Personnel Détaché / Étranger',
    icon: <Globe className="w-4 h-4" />,
    active: 'bg-purple-50 border-purple-500 text-purple-950 font-bold ring-2 ring-purple-500/20',
    iconActive: 'bg-purple-600 text-white',
  },
];

const CONTRACT_OPTIONS: {
  value: ContractType;
  title: string;
  lines: string[];
  icon: React.ReactNode;
  active: string;
}[] = [
  {
    value: 'TYPE_A',
    title: 'TYPE_A (6 mois)',
    lines: [
      '• 30j après 5 mois de travail',
      '• 6e mois : 30j de congés',
      '• ~0.1967 j/j travaillé (6 j/m)',
    ],
    icon: <BadgeCheck className="w-4 h-4 text-emerald-600" />,
    active:
      'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold ring-1 ring-emerald-500/30',
  },
  {
    value: 'TYPE_B',
    title: 'TYPE_B (12 mois)',
    lines: [
      '• 30j après 11 mois de travail',
      '• 12e mois : 30j de congés',
      '• ~0.0896 j/j travaillé (~2.73 j/m)',
    ],
    icon: <Briefcase className="w-4 h-4 text-blue-600" />,
    active: 'bg-blue-50 border-blue-500 text-blue-900 font-bold ring-1 ring-blue-500/30',
  },
];

const INACTIVE_CARD = 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100';

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  form,
  onRequestClose,
  onSubmit,
}) => {
  const { values, errors, editing, hasAttemptedSubmit, validity, setField } = form;
  const errorList = Object.values(errors).filter(Boolean);
  const isFullyValid = validity.validCount === 4;

  return (
    <Modal
      isOpen={form.isOpen}
      onClose={onRequestClose}
      icon={
        editing ? (
          <Edit3 className="w-5 h-5 text-amber-400" />
        ) : (
          <UserPlus className="w-5 h-5 text-amber-400" />
        )
      }
      title={editing ? `Modifier l'employé : ${editing.name}` : 'Nouvel Employé'}
      subtitle="Tous les champs marqués d'une étoile (*) sont strictement requis"
    >
      {hasAttemptedSubmit && errorList.length > 0 && (
        <div
          role="alert"
          className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-800"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Informations requises incomplètes ou invalides :</p>
            <ul className="list-disc pl-4 mt-1 space-y-0.5 text-2xs">
              {errorList.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <TextField
            label="Matricule RH"
            required
            mono
            icon={<Hash className="w-3 h-3 text-stone-500" />}
            placeholder="MAT-0001"
            value={values.idNumber}
            onChange={(v) => setField('idNumber', v)}
            error={errors.idNumber}
            isValid={validity.isIdValid}
          />

          <TextField
            label="Matricule GL"
            mono
            title="ID Société / ID Entreprise"
            icon={<Hash className="w-3 h-3 text-stone-500" />}
            placeholder="GL-0000"
            value={values.matriculeGL}
            onChange={(v) => setField('matriculeGL', v)}
          />

          <div className="sm:col-span-2">
            <TextField
              label="Nom & Prénom de l'employé"
              required
              placeholder="ex: Karim Alami"
              value={values.name}
              onChange={(v) => setField('name', v)}
              error={errors.name}
              isValid={validity.isNameValid}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextField
            label="Poste / Fonction"
            required
            icon={<Briefcase className="w-3 h-3 text-stone-500" />}
            placeholder="ex: Ingénieur Projet, Responsable RH"
            value={values.position}
            onChange={(v) => setField('position', v)}
            error={errors.position}
            isValid={validity.isPositionValid}
          />

          <TextField
            label="Nationalité"
            icon={<Globe className="w-3 h-3 text-stone-500" />}
            placeholder="ex: Sénégalaise, Française"
            value={values.nationality}
            onChange={(v) => setField('nationality', v)}
          />
        </div>

        <fieldset>
          <legend className="block text-2xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
            Statut Contractuel (LOCAL vs EXPAT) *
          </legend>
          <div className="grid grid-cols-2 gap-3">
            {STATUS_OPTIONS.map((option) => {
              const selected = values.status === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setField('status', option.value)}
                  className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    selected ? option.active : INACTIVE_CARD
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      selected ? option.iconActive : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    {option.icon}
                  </div>
                  <div>
                    <div className="text-xs font-bold">{option.title}</div>
                    <div className="text-[10px] text-stone-500 font-normal">{option.hint}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </fieldset>

        <TextField
          label="Date d'embauche"
          type="date"
          required
          icon={<Calendar className="w-3 h-3 text-stone-500" />}
          value={values.hireDate}
          onChange={(v) => setField('hireDate', v)}
          error={errors.hireDate}
          isValid={validity.isHireDateValid}
        />

        <fieldset>
          <legend className="block text-2xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
            Cycle de Congés & Droits *
          </legend>
          <div className="grid grid-cols-2 gap-3">
            {CONTRACT_OPTIONS.map((option) => {
              const selected = values.contractType === option.value;
              return (
                <label
                  key={option.value}
                  className={`flex flex-col p-3 rounded-2xl border cursor-pointer text-xs transition-all ${
                    selected ? option.active : INACTIVE_CARD
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <input
                      type="radio"
                      name="contractType"
                      value={option.value}
                      checked={selected}
                      onChange={() => setField('contractType', option.value)}
                      className="sr-only"
                    />
                    {option.icon}
                    {option.title}
                  </div>
                  <span className="text-[10px] font-normal text-stone-500 leading-relaxed">
                    {option.lines.map((line) => (
                      <React.Fragment key={line}>
                        {line}
                        <br />
                      </React.Fragment>
                    ))}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 flex items-center justify-between text-2xs">
          <span className="text-stone-500 font-medium">Validation des champs :</span>
          <span
            className={`font-bold flex items-center gap-1 ${
              isFullyValid ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            {isFullyValid ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Tous les champs requis sont remplis (4/4)
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                {4 - validity.validCount} information(s) requise(s) restante(s)
              </>
            )}
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
          <button
            type="button"
            onClick={onRequestClose}
            className="px-4 py-2.5 text-xs font-semibold text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer active:scale-98 flex items-center gap-2"
          >
            <Check className="w-4 h-4 text-amber-400" />
            <span>{editing ? 'Enregistrer les modifications' : "Créer l'employé"}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
