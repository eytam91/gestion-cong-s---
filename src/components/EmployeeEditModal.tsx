import React, { useState } from 'react';
import {
  X,
  Save,
  User,
  Briefcase,
  ShieldAlert,
  Car,
  ShieldCheck,
  FileText,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Building2,
  MapPin,
  Phone,
  CreditCard,
  HeartHandshake
} from 'lucide-react';
import { Employee, ContractType, EmployeeStatus, EmploymentStatusType, HRComplianceState } from '../types';

export type EditModalTab = 'IDENTITY' | 'CONTRACT' | 'INSESO' | 'PERMITS' | 'COMPLIANCE' | 'NOTES';

interface EmployeeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  initialTab?: EditModalTab;
  onSave: (updatedEmployee: Employee) => void;
}

export const EmployeeEditModal: React.FC<EmployeeEditModalProps> = ({
  isOpen,
  onClose,
  employee,
  initialTab = 'IDENTITY',
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<EditModalTab>(initialTab);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formData, setFormData] = useState<Employee>({ ...employee });

  if (!isOpen) return null;

  const handleChange = (field: keyof Employee, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNumericChange = (field: keyof Employee, valStr: string) => {
    if (valStr === '') {
      handleChange(field, undefined);
    } else {
      const num = Number(valStr);
      handleChange(field, isNaN(num) ? undefined : num);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Le nom du collaborateur est obligatoire.');
      setActiveTab('IDENTITY');
      return;
    }
    if (!formData.idNumber?.trim()) {
      alert('Le matricule RH est obligatoire.');
      setActiveTab('CONTRACT');
      return;
    }

    onSave(formData);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-stone-200 flex items-center justify-between bg-stone-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-xs ${
              formData.status === 'EXPAT' ? 'bg-purple-900' : 'bg-stone-900'
            }`}>
              {formData.name ? formData.name.charAt(0).toUpperCase() : 'E'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-stone-900">
                  Modifier le Dossier Employé
                </h2>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-stone-200 text-stone-800">
                  {formData.idNumber || 'SANS MATRICULE'}
                </span>
              </div>
              <p className="text-xs text-stone-500">
                {formData.name} • {formData.position || 'Poste non renseigné'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Enregistré !
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Category Tabs */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-stone-200 bg-stone-50/40 overflow-x-auto scrollbar-none shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('IDENTITY')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'IDENTITY'
                ? 'bg-stone-900 text-white shadow-2xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Identité & État Civil</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CONTRACT')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'CONTRACT'
                ? 'bg-stone-900 text-white shadow-2xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Poste & Contrat</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('INSESO')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'INSESO'
                ? 'bg-stone-900 text-white shadow-2xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Sécurité Sociale INSESO</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PERMITS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'PERMITS'
                ? 'bg-stone-900 text-white shadow-2xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>Titres, Permis & Séjour</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('COMPLIANCE')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'COMPLIANCE'
                ? 'bg-stone-900 text-white shadow-2xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Conformité & Contrôle RH</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('NOTES')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'NOTES'
                ? 'bg-stone-900 text-white shadow-2xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Notes Internes</span>
            {formData.notes && (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: IDENTITÉ & ÉTAT CIVIL */}
          {activeTab === 'IDENTITY' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-emerald-600" />
                  État Civil & Informations Personnelles
                </h3>
                <p className="text-2xs text-stone-500">
                  Modifiez les données personnelles du collaborateur. Les erreurs de saisie sont immédiatement corrigées.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                    Nom & Prénoms complets *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 font-semibold"
                    placeholder="ex: KOUASSI Marc Aurèle"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                    Sexe
                  </label>
                  <select
                    value={formData.sex || ''}
                    onChange={(e) => handleChange('sex', e.target.value || undefined)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 bg-white"
                  >
                    <option value="">Non renseigné</option>
                    <option value="M">Masculin (M)</option>
                    <option value="F">Féminin (F)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                    Prénoms (Given Names)
                  </label>
                  <input
                    type="text"
                    value={formData.givenNames || ''}
                    onChange={(e) => handleChange('givenNames', e.target.value || undefined)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    placeholder="Prénoms usuels"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                    Noms de Famille (Surnames)
                  </label>
                  <input
                    type="text"
                    value={formData.surnames || ''}
                    onChange={(e) => handleChange('surnames', e.target.value || undefined)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    placeholder="Nom patronymique"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                    Autres Orthographes / Nom d'usage
                  </label>
                  <input
                    type="text"
                    value={formData.otherSpellings || ''}
                    onChange={(e) => handleChange('otherSpellings', e.target.value || undefined)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    placeholder="Variante orthographique"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                    Date de Naissance
                  </label>
                  <input
                    type="date"
                    value={formData.birthDate || ''}
                    onChange={(e) => handleChange('birthDate', e.target.value || undefined)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                    Âge (Calculé ou déclaré)
                  </label>
                  <input
                    type="number"
                    min="16"
                    max="80"
                    value={formData.age ?? ''}
                    onChange={(e) => handleNumericChange('age', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    placeholder="ex: 34"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                    Nationalité
                  </label>
                  <input
                    type="text"
                    value={formData.nationality || ''}
                    onChange={(e) => handleChange('nationality', e.target.value || undefined)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    placeholder="ex: Équato-guinéenne, Camerounaise, etc."
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                    Pays de Nationalité
                  </label>
                  <input
                    type="text"
                    value={formData.nationalityCountry || ''}
                    onChange={(e) => handleChange('nationalityCountry', e.target.value || undefined)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    placeholder="ex: Guinée Équatoriale, Gabon, etc."
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                    Situation Matrimoniale
                  </label>
                  <select
                    value={formData.maritalStatus || ''}
                    onChange={(e) => handleChange('maritalStatus', e.target.value || undefined)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 bg-white"
                  >
                    <option value="">Non précisée</option>
                    <option value="Célibataire">Célibataire</option>
                    <option value="Marié(e)">Marié(e)</option>
                    <option value="Divorcé(e)">Divorcé(e)</option>
                    <option value="Veuf/Veuve">Veuf/Veuve</option>
                  </select>
                </div>

                <div>
                  <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                    Nombre d'enfants à charge
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={formData.childrenCount ?? ''}
                    onChange={(e) => handleNumericChange('childrenCount', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    placeholder="0"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                    Adresse & Quartier de Résidence
                  </label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => handleChange('address', e.target.value || undefined)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    placeholder="ex: Quartier Ela Nguema, Malabo"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                    Niveau d'Études / Diplôme
                  </label>
                  <input
                    type="text"
                    value={formData.educationLevel || ''}
                    onChange={(e) => handleChange('educationLevel', e.target.value || undefined)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    placeholder="ex: Baccalauréat, BTS, Licence..."
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                    Téléphone Principal (Tél 1)
                  </label>
                  <input
                    type="text"
                    value={formData.phone1 || ''}
                    onChange={(e) => handleChange('phone1', e.target.value || undefined)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 font-mono"
                    placeholder="+240 222..."
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                    Téléphone Secondaire (Tél 2)
                  </label>
                  <input
                    type="text"
                    value={formData.phone2 || ''}
                    onChange={(e) => handleChange('phone2', e.target.value || undefined)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 font-mono"
                    placeholder="Numéro de contact d'urgence"
                  />
                </div>
              </div>

              {/* Identity Documents Sub-section */}
              <div className="pt-4 border-t border-stone-200">
                <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-3">
                  Pièce d'Identité Officielle
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                      Type de Pièce
                    </label>
                    <input
                      type="text"
                      value={formData.idDocumentType || ''}
                      onChange={(e) => handleChange('idDocumentType', e.target.value || undefined)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                      placeholder="ex: DIP, Passeport, CNI"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                      Numéro de Pièce d'Identité
                    </label>
                    <input
                      type="text"
                      value={formData.idDocumentNumber || ''}
                      onChange={(e) => handleChange('idDocumentNumber', e.target.value || undefined)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 font-mono"
                      placeholder="ex: P422766"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                      N° Pièce Enregistré à l'INSESO
                    </label>
                    <input
                      type="text"
                      value={formData.idDocumentNumberAtInseso || ''}
                      onChange={(e) => handleChange('idDocumentNumberAtInseso', e.target.value || undefined)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 font-mono"
                      placeholder="Si différent du N° actuel"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: POSTE, CONTRAT & AFFECTATION */}
          {activeTab === 'CONTRACT' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2 mb-1">
                  <Briefcase className="w-4 h-4 text-purple-600" />
                  Données Contractuelles, Affectation & Rémunération
                </h3>
                <p className="text-2xs text-stone-500">
                  Définissez le régime de travail (Type A rotatif 6 mois / Type B annuel 12 mois), le statut juridique et les dates d'embauche.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                    Matricule RH unique *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.idNumber || ''}
                    onChange={(e) => handleChange('idNumber', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 font-mono font-bold"
                    placeholder="MAT-0001 ou P..."
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                    Matricule GL / Société
                  </label>
                  <input
                    type="text"
                    value={formData.matriculeGL || ''}
                    onChange={(e) => handleChange('matriculeGL', e.target.value || undefined)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 font-mono"
                    placeholder="GL-0001"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                    Statut Juridique Collaborateur *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value as EmployeeStatus)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 bg-white font-semibold"
                  >
                    <option value="LOCAL">Personnel Local (LOCAL)</option>
                    <option value="EXPAT">Personnel Expatrié (EXPAT)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                    Intitulé du Poste / Fonction *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.position || ''}
                    onChange={(e) => handleChange('position', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 font-semibold"
                    placeholder="ex: Conducteur d'engins, Ingénieur Travaux, Comptable..."
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                    Département / Service
                  </label>
                  <input
                    type="text"
                    value={formData.department || ''}
                    onChange={(e) => handleChange('department', e.target.value || undefined)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    placeholder="ex: Exploitation, Parc Matériel, RH..."
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                    Site Opérationnel d'Affectation
                  </label>
                  <select
                    value={formData.site || 'MALABO'}
                    onChange={(e) => handleChange('site', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 bg-white"
                  >
                    <option value="MALABO">MALABO</option>
                    <option value="BATA">BATA</option>
                    <option value="MONGOMO">MONGOMO</option>
                    <option value="OYALA">OYALA</option>
                    <option value="EBEBIYIN">EBEBIYIN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                    Type de Contrat (Régime des Congés) *
                  </label>
                  <select
                    value={formData.contractType}
                    onChange={(e) => handleChange('contractType', e.target.value as ContractType)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 bg-white font-bold text-stone-900"
                  >
                    <option value="TYPE_A">TYPE A — Cycle 6 Mois (30 j tous les 6 mois)</option>
                    <option value="TYPE_B">TYPE B — Cycle 12 Mois (30 j par an)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                    Statut d'Activité RH
                  </label>
                  <select
                    value={formData.employmentStatus || 'ACTIF'}
                    onChange={(e) => handleChange('employmentStatus', e.target.value as EmploymentStatusType)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 bg-white"
                  >
                    <option value="ACTIF">ACTIF (En poste)</option>
                    <option value="A_CONFIRMER">À CONFIRMER (Période d'essai / Audit)</option>
                    <option value="CONTRAT_TERMINE">CONTRAT TERMINÉ (Départ / Fin contrat)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                    Date d'Embauche Initiale *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.hireDate || ''}
                    onChange={(e) => handleChange('hireDate', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                    Date Début de Contrat
                  </label>
                  <input
                    type="date"
                    value={formData.contractStartDate || formData.hireDate || ''}
                    onChange={(e) => handleChange('contractStartDate', e.target.value || undefined)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                    Date Fin de Contrat (si CDD)
                  </label>
                  <input
                    type="date"
                    value={formData.contractEndDate || ''}
                    onChange={(e) => handleChange('contractEndDate', e.target.value || undefined)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                    Salaire de Base Mensuel (FCFA)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.baseSalary ?? ''}
                    onChange={(e) => handleNumericChange('baseSalary', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 font-mono"
                    placeholder="ex: 250000"
                  />
                </div>
              </div>

              {/* Allowances Sub-section */}
              <div className="pt-4 border-t border-stone-200">
                <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-3">
                  Primes & Avantages en Nature
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex items-center gap-2.5 p-3 rounded-2xl border border-stone-200 bg-stone-50 cursor-pointer hover:bg-stone-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.allowanceFood)}
                      onChange={(e) => handleChange('allowanceFood', e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span className="text-xs font-semibold text-stone-800">Prime de Repas (Comida)</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-2xl border border-stone-200 bg-stone-50 cursor-pointer hover:bg-stone-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.allowanceSpecial)}
                      onChange={(e) => handleChange('allowanceSpecial', e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span className="text-xs font-semibold text-stone-800">Prime Spéciale Chantier</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-2xl border border-stone-200 bg-stone-50 cursor-pointer hover:bg-stone-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.allowanceHousing)}
                      onChange={(e) => handleChange('allowanceHousing', e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span className="text-xs font-semibold text-stone-800">Indemnité de Logement</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SÉCURITÉ SOCIALE INSESO */}
          {activeTab === 'INSESO' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2 mb-1">
                  <ShieldAlert className="w-4 h-4 text-teal-600" />
                  Immatriculation & Sécurité Sociale INSESO
                </h3>
                <p className="text-2xs text-stone-500">
                  Enregistrez ou corrigez les numéros d'affiliation INSESO et contrôlez la concordance avec les bordereaux de déclaration.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="sm:col-span-3">
                  <label className="flex items-center gap-3 p-4 rounded-2xl border border-stone-200 bg-stone-50 cursor-pointer hover:bg-stone-100">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.isInsured)}
                      onChange={(e) => handleChange('isInsured', e.target.checked)}
                      className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-stone-900 block">Collaborateur Déclaré & Affilié à l'INSESO</span>
                      <span className="text-2xs text-stone-500">Cochez si le collaborateur est immatriculé et cotisant à la Caisse Nationale de Sécurité Sociale.</span>
                    </div>
                  </label>
                </div>

                <div>
                  <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                    N° Sécurité Sociale INSESO
                  </label>
                  <input
                    type="text"
                    value={formData.ssNumber || ''}
                    onChange={(e) => handleChange('ssNumber', e.target.value || undefined)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 font-mono font-bold"
                    placeholder="ex: 12345/2022"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                    N° Duplicata INSESO
                  </label>
                  <input
                    type="text"
                    value={formData.ssNumberDuplicate || ''}
                    onChange={(e) => handleChange('ssNumberDuplicate', e.target.value || undefined)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 font-mono"
                    placeholder="Si double immatriculation"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                    N° Séquence Bordereau INSESO
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.insesoSequenceNumber ?? ''}
                    onChange={(e) => handleNumericChange('insesoSequenceNumber', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 font-mono"
                    placeholder="ex: 42"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                    Date d'Immatriculation INSESO
                  </label>
                  <input
                    type="date"
                    value={formData.insesoDate || ''}
                    onChange={(e) => handleChange('insesoDate', e.target.value || undefined)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 font-mono"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.inInsesoListAug2026)}
                      onChange={(e) => handleChange('inInsesoListAug2026', e.target.checked)}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-xs font-semibold text-stone-800">Inscrit sur bordereau Août 2026</span>
                  </label>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.inPersonnelFile)}
                      onChange={(e) => handleChange('inPersonnelFile', e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-semibold text-stone-800">Dossier physique RH présent</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TITRES DE SÉJOUR & PERMIS */}
          {activeTab === 'PERMITS' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2 mb-1">
                  <Car className="w-4 h-4 text-cyan-600" />
                  Titres de Séjour, Permis de Travail & Permis de Conduire
                </h3>
                <p className="text-2xs text-stone-500">
                  Suivi des autorisations légales, dates d'expiration et états de validité pour les personnels locaux et expatriés.
                </p>
              </div>

              {/* Residence Permit */}
              <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    1. Carte de Résidence / Titre de Séjour
                  </h4>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-700">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.residenceRequired)}
                      onChange={(e) => handleChange('residenceRequired', e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500"
                    />
                    <span>Requis pour cet employé</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-2xs font-bold text-stone-600 uppercase mb-1">
                      Date de Délivrance
                    </label>
                    <input
                      type="date"
                      value={formData.residenceStart || ''}
                      onChange={(e) => handleChange('residenceStart', e.target.value || undefined)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-stone-600 uppercase mb-1">
                      Date d'Expiration
                    </label>
                    <input
                      type="date"
                      value={formData.residenceExpiry || ''}
                      onChange={(e) => handleChange('residenceExpiry', e.target.value || undefined)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-stone-600 uppercase mb-1">
                      État du Titre de Séjour
                    </label>
                    <select
                      value={formData.residenceState || 'VALIDE'}
                      onChange={(e) => handleChange('residenceState', e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 bg-white font-medium"
                    >
                      <option value="VALIDE">VALIDE</option>
                      <option value="A_RENOUVELER">À RENOUVELER</option>
                      <option value="EXPIRE">EXPIRÉ</option>
                      <option value="SANS_TITRE">SANS TITRE</option>
                      <option value="NON_REQUIS">NON REQUIS</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Work Permit */}
              <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    2. Permis de Travail (Ministère du Travail)
                  </h4>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-700">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.workPermitRequired)}
                      onChange={(e) => handleChange('workPermitRequired', e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500"
                    />
                    <span>Requis pour cet employé</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-2xs font-bold text-stone-600 uppercase mb-1">
                      Numéro de Permis
                    </label>
                    <input
                      type="text"
                      value={formData.workPermitNumber || ''}
                      onChange={(e) => handleChange('workPermitNumber', e.target.value || undefined)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 bg-white font-mono"
                      placeholder="N° d'autorisation"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-stone-600 uppercase mb-1">
                      Date Début
                    </label>
                    <input
                      type="date"
                      value={formData.workPermitStart || ''}
                      onChange={(e) => handleChange('workPermitStart', e.target.value || undefined)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-stone-600 uppercase mb-1">
                      Date Expiration
                    </label>
                    <input
                      type="date"
                      value={formData.workPermitExpiry || ''}
                      onChange={(e) => handleChange('workPermitExpiry', e.target.value || undefined)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-stone-600 uppercase mb-1">
                      État du Permis
                    </label>
                    <select
                      value={formData.workPermitState || 'VALIDE'}
                      onChange={(e) => handleChange('workPermitState', e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 bg-white font-medium"
                    >
                      <option value="VALIDE">VALIDE</option>
                      <option value="A_RENOUVELER">À RENOUVELER</option>
                      <option value="EXPIRE">EXPIRÉ</option>
                      <option value="SANS_TITRE">SANS TITRE</option>
                      <option value="NON_REQUIS">NON REQUIS</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Driving Licence */}
              <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    3. Permis de Conduire Professionnel
                  </h4>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-700">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.drivingLicenceRequired)}
                      onChange={(e) => handleChange('drivingLicenceRequired', e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500"
                    />
                    <span>Requis pour le poste</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-2xs font-bold text-stone-600 uppercase mb-1">
                      Numéro de Permis
                    </label>
                    <input
                      type="text"
                      value={formData.drivingLicenceNumber || ''}
                      onChange={(e) => handleChange('drivingLicenceNumber', e.target.value || undefined)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 bg-white font-mono"
                      placeholder="Catégorie B, C, D..."
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-stone-600 uppercase mb-1">
                      Date Délivrance
                    </label>
                    <input
                      type="date"
                      value={formData.drivingLicenceStart || ''}
                      onChange={(e) => handleChange('drivingLicenceStart', e.target.value || undefined)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-stone-600 uppercase mb-1">
                      Date Expiration
                    </label>
                    <input
                      type="date"
                      value={formData.drivingLicenceExpiry || ''}
                      onChange={(e) => handleChange('drivingLicenceExpiry', e.target.value || undefined)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-stone-600 uppercase mb-1">
                      État du Permis
                    </label>
                    <select
                      value={formData.drivingLicenceState || 'VALIDE'}
                      onChange={(e) => handleChange('drivingLicenceState', e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 bg-white font-medium"
                    >
                      <option value="VALIDE">VALIDE</option>
                      <option value="A_RENOUVELER">À RENOUVELER</option>
                      <option value="EXPIRE">EXPIRÉ</option>
                      <option value="NON_REQUIS">NON REQUIS</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CONFORMITÉ & CONTRÔLE RH */}
          {activeTab === 'COMPLIANCE' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  État de Conformité Réglementaire & Points de Contrôle
                </h3>
                <p className="text-2xs text-stone-500">
                  Déterminez la situation du dossier employé pour les filtres et les alertes d'audit RH.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                    État Général du Dossier RH *
                  </label>
                  <select
                    value={formData.overallState || 'EN_REGLE'}
                    onChange={(e) => handleChange('overallState', e.target.value as HRComplianceState)}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 bg-white font-bold"
                  >
                    <option value="EN_REGLE">EN RÈGLE — Dossier complet et à jour</option>
                    <option value="A_REGULARISER">À RÉGULARISER — Document manquant ou anomalie prioritaire</option>
                    <option value="A_RENOUVELER">À RENOUVELER — Titre de séjour, visa ou permis arrivant à échéance</option>
                    <option value="A_COMPLETER_VERIFIER">À COMPLÉTER / VÉRIFIER — Données à contrôler ou pièces à fournir</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                    Motifs de l'état / Anomalies constatées
                  </label>
                  <input
                    type="text"
                    value={formData.stateReasons || ''}
                    onChange={(e) => handleChange('stateReasons', e.target.value || undefined)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    placeholder="ex: Titre de séjour expiré depuis le 15/08, attestation d'assurance manquante"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                    Détail des Points Ouverts à Régulariser
                  </label>
                  <textarea
                    rows={2}
                    value={formData.openItemsDetail || ''}
                    onChange={(e) => handleChange('openItemsDetail', e.target.value || undefined)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
                    placeholder="Liste des démarches en cours ou documents réclamés au collaborateur..."
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                    Historique des Corrections Appliquées
                  </label>
                  <input
                    type="text"
                    value={formData.correctionsApplied || ''}
                    onChange={(e) => handleChange('correctionsApplied', e.target.value || undefined)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    placeholder="ex: Rectification du nom suite à vérification passeport le 20/09"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                    Nombre d'éléments à compléter
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.openItemsToComplete ?? ''}
                    onChange={(e) => handleNumericChange('openItemsToComplete', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">
                    Nombre de points à vérifier
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.openItemsToVerify ?? ''}
                    onChange={(e) => handleNumericChange('openItemsToVerify', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: NOTES INTERNES RH */}
          {activeTab === 'NOTES' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-amber-600" />
                  Notes & Remarques Internes du Dossier
                </h3>
                <p className="text-2xs text-stone-500">
                  Consignez les annotations administratives, les consignes particulières ou les corrections d'erreurs apportées au dossier.
                </p>
              </div>

              <div>
                <textarea
                  rows={8}
                  value={formData.notes || ''}
                  onChange={(e) => handleChange('notes', e.target.value || undefined)}
                  className="w-full p-4 text-xs rounded-2xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 leading-relaxed font-sans"
                  placeholder="Écrivez ici vos notes, remarques d'entretien, suivi d'erreurs ou consignes RH..."
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap text-2xs">
                <span className="text-stone-400">Insérer rapidement :</span>
                <button
                  type="button"
                  onClick={() => {
                    const stamp = `[${new Date().toLocaleDateString('fr-FR')} - Note RH] : `;
                    handleChange('notes', formData.notes ? `${formData.notes}\n${stamp}` : stamp);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold cursor-pointer"
                >
                  + Horodatage
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const text = `[${new Date().toLocaleDateString('fr-FR')}] Vérification conformité : dossier vérifié et complet.`;
                    handleChange('notes', formData.notes ? `${formData.notes}\n${text}` : text);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold cursor-pointer border border-emerald-200"
                >
                  + Dossier validé
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const text = `[${new Date().toLocaleDateString('fr-FR')}] Anomalie signalée : document en attente de transmission par le collaborateur.`;
                    handleChange('notes', formData.notes ? `${formData.notes}\n${text}` : text);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold cursor-pointer border border-amber-200"
                >
                  + Relance document
                </button>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
            >
              Annuler
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-xs transition-all cursor-pointer active:scale-98"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer les Modifications</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
