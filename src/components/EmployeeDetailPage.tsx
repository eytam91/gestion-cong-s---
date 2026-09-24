import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  User,
  FileText,
  Upload,
  Download,
  Trash2,
  Calendar,
  ShieldAlert,
  ShieldCheck,
  Briefcase,
  Building2,
  MapPin,
  Clock,
  Phone,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Plus,
  Eye,
  ChevronLeft,
  ChevronRight,
  Printer,
  Sparkles,
  Tag,
  Car,
  FileCheck,
  X,
  GraduationCap,
  HeartHandshake,
  DollarSign,
  Edit3
} from 'lucide-react';
import { Employee, EmployeeDocument, DocumentCategory, LeaveRecord } from '../types';
import { calculateEmployeeStats, LEAVE_TYPE_LABELS } from '../utils/vacationCalc';
import { EmployeeEditModal, EditModalTab } from './EmployeeEditModal';
import { EmployeeNotesArea } from './EmployeeNotesArea';
import { ConfidentialMask } from './ConfidentialMask';
import { useAuth } from '../context/AuthContext';

interface EmployeeDetailPageProps {
  employee: Employee;
  leaveRecords: LeaveRecord[];
  allEmployees: Employee[];
  onBack: () => void;
  onUpdateEmployee: (employee: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onOpenLeaveModal: (employeeId: string) => void;
  onSelectEmployee: (id: string) => void;
}

const CATEGORY_LABELS: Record<DocumentCategory, { label: string; color: string }> = {
  CONTRAT: { label: 'Contrat de Travail', color: 'bg-blue-50 text-blue-800 border-blue-200' },
  PIECE_IDENTITE: { label: 'Pièce d\'Identité (DIP / Passeport)', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  TITRE_SEJOUR: { label: 'Titre de Séjour / Résidence', color: 'bg-purple-50 text-purple-800 border-purple-200' },
  PERMIS_TRAVAIL: { label: 'Permis de Travail', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  PERMIS_CONDUIRE: { label: 'Permis de Conduire', color: 'bg-cyan-50 text-cyan-800 border-cyan-200' },
  ATTESTATION_INSESO: { label: 'Attestation INSESO / Sécurité Sociale', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  SANCTION: { label: 'Sanction / Mesure Disciplinaire', color: 'bg-red-50 text-red-800 border-red-200' },
  CERTIFICAT_MEDICAL: { label: 'Certificat Médical', color: 'bg-teal-50 text-teal-800 border-teal-200' },
  DIPLOME: { label: 'Diplôme / Formation', color: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
  AUTRE: { label: 'Autre Document RH', color: 'bg-stone-50 text-stone-700 border-stone-200' }
};

export const EmployeeDetailPage: React.FC<EmployeeDetailPageProps> = ({
  employee,
  leaveRecords,
  allEmployees,
  onBack,
  onUpdateEmployee,
  onDeleteEmployee,
  onOpenLeaveModal,
  onSelectEmployee
}) => {
  type TabType = 'OVERVIEW' | 'DOCUMENTS' | 'PERSONAL' | 'CONTRACT' | 'INSESO' | 'PERMITS' | 'LEAVES' | 'SANCTIONS' | 'NOTES';
  const [activeTab, setActiveTab] = useState<TabType>('OVERVIEW');
  const { isAdmin } = useAuth();

  // Employee Edit Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editModalInitialTab, setEditModalInitialTab] = useState<EditModalTab>('IDENTITY');

  const handleOpenEditModal = (tab: EditModalTab = 'IDENTITY') => {
    setEditModalInitialTab(tab);
    setIsEditModalOpen(true);
  };

  // Document upload state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docCategory, setDocCategory] = useState<DocumentCategory>('AUTRE');
  const [docNotes, setDocNotes] = useState('');
  const [docName, setDocName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<EmployeeDocument | null>(null);

  // Status edit modal
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [statusForm, setStatusForm] = useState({
    employmentStatus: employee.employmentStatus || 'ACTIF',
    overallState: employee.overallState || 'EN_REGLE',
    stateReasons: employee.stateReasons || '',
    openItemsDetail: employee.openItemsDetail || ''
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stats calculation
  const stats = calculateEmployeeStats(employee, leaveRecords);
  const employeeLeaves = leaveRecords.filter(r => r.employeeId === employee.id);

  // Navigation indices
  const currentIndex = allEmployees.findIndex(e => e.id === employee.id);
  const prevEmployee = currentIndex > 0 ? allEmployees[currentIndex - 1] : null;
  const nextEmployee = currentIndex < allEmployees.length - 1 ? allEmployees[currentIndex + 1] : null;

  // Status badge styling
  const getOverallStateBadge = (state?: string) => {
    switch (state) {
      case 'EN_REGLE':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          dot: 'bg-emerald-500',
          label: 'Dossier En Règle',
          icon: ShieldCheck
        };
      case 'A_REGULARISER':
        return {
          bg: 'bg-red-50 text-red-800 border-red-300',
          dot: 'bg-red-500',
          label: 'À Régulariser d\'Urgence',
          icon: ShieldAlert
        };
      case 'A_RENOUVELER':
        return {
          bg: 'bg-amber-50 text-amber-900 border-amber-300',
          dot: 'bg-amber-500',
          label: 'Titre / Permis à Renouveler',
          icon: AlertTriangle
        };
      case 'A_COMPLETER_VERIFIER':
        return {
          bg: 'bg-indigo-50 text-indigo-900 border-indigo-300',
          dot: 'bg-indigo-500',
          label: 'À Compléter / Vérifier',
          icon: AlertCircle
        };
      default:
        return {
          bg: 'bg-stone-100 text-stone-800 border-stone-300',
          dot: 'bg-stone-500',
          label: state || 'Statut Inconnu',
          icon: ShieldCheck
        };
    }
  };

  const overallBadge = getOverallStateBadge(employee.overallState);
  const OverallIcon = overallBadge.icon;

  // File Upload Handlers (Drag and drop + manual click)
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    if (!docName) {
      setDocName(file.name);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSaveUploadedDocument = () => {
    if (!selectedFile && !docName) return;

    const newDocId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const reader = new FileReader();

    const finishSave = (base64Data?: string) => {
      const newDoc: EmployeeDocument = {
        id: newDocId,
        employeeId: employee.id,
        name: docName.trim() || selectedFile?.name || 'Document RH sans titre',
        category: docCategory,
        uploadDate: new Date().toISOString(),
        size: selectedFile ? selectedFile.size : 150000,
        type: selectedFile ? selectedFile.type : 'application/pdf',
        fileData: base64Data,
        notes: docNotes.trim() || undefined
      };

      const existingDocs = employee.documents || [];
      const updatedEmployee: Employee = {
        ...employee,
        documents: [newDoc, ...existingDocs]
      };

      onUpdateEmployee(updatedEmployee);
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setDocName('');
      setDocNotes('');
      setDocCategory('AUTRE');
    };

    if (selectedFile) {
      reader.onloadend = () => {
        finishSave(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      finishSave();
    }
  };

  const handleDeleteDocument = (docId: string) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette pièce jointe du dossier employé ?')) return;

    const existingDocs = employee.documents || [];
    const updatedEmployee: Employee = {
      ...employee,
      documents: existingDocs.filter(d => d.id !== docId)
    };
    onUpdateEmployee(updatedEmployee);
    if (previewDocument?.id === docId) {
      setPreviewDocument(null);
    }
  };

  const handleSaveStatus = () => {
    const updated: Employee = {
      ...employee,
      employmentStatus: statusForm.employmentStatus as any,
      overallState: statusForm.overallState as any,
      stateReasons: statusForm.stateReasons,
      openItemsDetail: statusForm.openItemsDetail
    };
    onUpdateEmployee(updated);
    setIsEditingStatus(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Breadcrumb & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à la liste</span>
          </button>

          <span className="text-stone-300">|</span>

          <div className="flex items-center gap-1 text-xs text-stone-500">
            <span>Dossier Employé</span>
            <span className="text-stone-400">/</span>
            <span className="font-bold text-stone-900 font-mono">{employee.idNumber || employee.id}</span>
          </div>
        </div>

        {/* Quick Employee Pagination & Print */}
        <div className="flex items-center gap-2">
          {prevEmployee && (
            <button
              onClick={() => onSelectEmployee(prevEmployee.id)}
              className="p-2 rounded-xl text-xs font-semibold text-stone-600 bg-stone-50 hover:bg-stone-100 border border-stone-200 transition-colors cursor-pointer"
              title={`Précédent: ${prevEmployee.name}`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <span className="text-2xs font-mono font-bold text-stone-500 px-2">
            {currentIndex + 1} / {allEmployees.length}
          </span>
          {nextEmployee && (
            <button
              onClick={() => onSelectEmployee(nextEmployee.id)}
              className="p-2 rounded-xl text-xs font-semibold text-stone-600 bg-stone-50 hover:bg-stone-100 border border-stone-200 transition-colors cursor-pointer"
              title={`Suivant: ${nextEmployee.name}`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 transition-colors cursor-pointer ml-2"
            title="Imprimer ou Exporter la fiche RH en PDF"
          >
            <Printer className="w-3.5 h-3.5 text-stone-500" />
            <span className="hidden md:inline">Imprimer Fiche</span>
          </button>
        </div>
      </div>

      {/* Hero Employee Identity Card */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar with Status badge */}
            <div className="relative">
              <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-md ${
                employee.status === 'EXPAT' ? 'bg-gradient-to-br from-purple-700 to-indigo-900' : 'bg-gradient-to-br from-stone-800 to-stone-950'
              }`}>
                {employee.name ? employee.name.charAt(0).toUpperCase() : 'E'}
              </div>
              <div className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full border-2 border-white flex items-center justify-center ${overallBadge.dot}`}>
                <OverallIcon className="w-4 h-4 text-white" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                  {employee.name}
                </h1>
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-stone-100 text-stone-800 border border-stone-200">
                  {employee.idNumber || 'SANS MATRICULE'}
                </span>
                {employee.matriculeGL && employee.matriculeGL !== employee.idNumber && (
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                    GL: {employee.matriculeGL}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-stone-600 font-medium flex-wrap">
                <span className="flex items-center gap-1">
                  <Briefcase className="w-4 h-4 text-stone-400" />
                  {employee.position}
                </span>
                <span className="text-stone-300">•</span>
                <span className="flex items-center gap-1">
                  <Building2 className="w-4 h-4 text-stone-400" />
                  {employee.department || 'Non assigné'}
                </span>
                <span className="text-stone-300">•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-stone-400" />
                  {employee.site || 'Site Principal'}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1 flex-wrap">
                {/* Status Pills */}
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${overallBadge.bg}`}>
                  <span className={`w-2 h-2 rounded-full ${overallBadge.dot}`} />
                  {overallBadge.label}
                </span>

                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  employee.employmentStatus === 'ACTIF' 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : employee.employmentStatus === 'A_CONFIRMER'
                    ? 'bg-amber-100 text-amber-900'
                    : 'bg-stone-200 text-stone-700'
                }`}>
                  Contrat: {employee.employmentStatus || 'ACTIF'}
                </span>

                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  employee.status === 'EXPAT' ? 'bg-purple-100 text-purple-800' : 'bg-teal-100 text-teal-800'
                }`}>
                  {employee.status === 'EXPAT' ? 'Expatrié' : 'Personnel Local'} ({employee.contractType === 'TYPE_A' ? 'Cycle 6m' : 'Cycle 12m'})
                </span>

                {employee.nationality && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-700 border border-stone-200">
                    Nationalité: {employee.nationality}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => handleOpenEditModal('IDENTITY')}
              className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer active:scale-98"
            >
              <Edit3 className="w-4 h-4 text-amber-400" />
              <span>Modifier les Informations</span>
            </button>

            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4 text-stone-600" />
              <span>Téléverser Document</span>
            </button>

            <button
              onClick={() => onOpenLeaveModal(employee.id)}
              className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>Saisir Congé</span>
            </button>

            <button
              onClick={() => handleOpenEditModal('COMPLIANCE')}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer"
            >
              <span>Ajuster Statut RH</span>
            </button>
          </div>
        </div>

        {/* Highlighted Alerts Banner if issues detected */}
        {(employee.stateReasons || employee.overallState === 'A_REGULARISER' || employee.overallState === 'A_RENOUVELER' || stats.isDebt) && (
          <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
            employee.overallState === 'A_REGULARISER' || stats.isDebt 
              ? 'bg-rose-50 border-rose-200 text-rose-900' 
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Points d'attention & Régularisations requises</span>
            </div>
            <div className="space-y-1 pl-6 text-2xs leading-relaxed">
              {employee.stateReasons && (
                <p>• <strong>Motif RH:</strong> {employee.stateReasons}</p>
              )}
              {employee.openItemsDetail && (
                <p>• <strong>Détail contrôle:</strong> {employee.openItemsDetail}</p>
              )}
              {stats.isDebt && (
                <p>• <strong>Dépassement congés:</strong> Doit régulariser {stats.debtDays.toFixed(1)} jour(s) de congé pris en avance (~{stats.daysToPayback} jours de travail estimés).</p>
              )}
            </div>
          </div>
        )}

        {/* Quick KPI stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-stone-100">
          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80">
            <span className="text-3xs font-bold text-stone-400 uppercase tracking-wider block">Solde Congés</span>
            <div className="flex items-baseline gap-1 mt-1 font-mono">
              <span className={`text-xl font-extrabold ${stats.isDebt ? 'text-red-700' : 'text-emerald-700'}`}>
                {stats.isDebt ? `-${stats.debtDays.toFixed(1)}` : `+${stats.balanceDays.toFixed(1)}`}
              </span>
              <span className="text-xs text-stone-500">jours</span>
            </div>
            <span className="text-3xs text-stone-500 mt-0.5 block">
              Acquis : +{stats.totalAccruedDays.toFixed(1)} j | Pris : {stats.totalLeaveTakenDays} j
            </span>
          </div>

          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80">
            <span className="text-3xs font-bold text-stone-400 uppercase tracking-wider block">Documents Classés</span>
            <div className="flex items-baseline gap-1 mt-1 font-mono">
              <span className="text-xl font-extrabold text-stone-900">
                {(employee.documents || []).length}
              </span>
              <span className="text-xs text-stone-500">fichiers</span>
            </div>
            <span className="text-3xs text-stone-500 mt-0.5 block">
              Dossier RH & Pièces Jointes
            </span>
          </div>

          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80">
            <span className="text-3xs font-bold text-stone-400 uppercase tracking-wider block">Ancienneté</span>
            <div className="flex items-baseline gap-1 mt-1 font-mono">
              <span className="text-xl font-extrabold text-stone-900">
                {employee.seniorityYears !== undefined ? `${employee.seniorityYears}a ${employee.seniorityMonths || 0}m` : `${Math.floor(stats.daysSinceHire / 30.4375)}m`}
              </span>
            </div>
            <span className="text-3xs text-stone-500 mt-0.5 block">
              Embauché le {new Date(employee.hireDate).toLocaleDateString('fr-FR')}
            </span>
          </div>

          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80">
            <span className="text-3xs font-bold text-stone-400 uppercase tracking-wider block">Sécurité Sociale INSESO</span>
            <div className="flex items-baseline gap-1 mt-1 font-mono">
              <span className={`text-sm font-bold truncate ${employee.isInsured ? 'text-emerald-700' : 'text-amber-700'}`}>
                {employee.ssNumber || (employee.isInsured ? 'Affilié' : 'Non déclaré')}
              </span>
            </div>
            <span className="text-3xs text-stone-500 mt-0.5 block">
              {employee.insesoSequenceNumber ? `Séquence #${employee.insesoSequenceNumber}` : 'Enregistrement'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-stone-200 scrollbar-none">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'OVERVIEW'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span>Statut RH & Synthèse</span>
        </button>

        <button
          onClick={() => setActiveTab('DOCUMENTS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'DOCUMENTS'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <FileText className="w-4 h-4 text-blue-400" />
          <span>Documents & Pièces Jointes ({(employee.documents || []).length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PERSONAL')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'PERSONAL'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <User className="w-4 h-4 text-emerald-400" />
          <span>État Civil & Coordonnées</span>
        </button>

        <button
          onClick={() => setActiveTab('CONTRACT')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'CONTRACT'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Briefcase className="w-4 h-4 text-purple-400" />
          <span>Contrat & Affectation</span>
        </button>

        <button
          onClick={() => setActiveTab('INSESO')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'INSESO'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-teal-400" />
          <span>Sécurité Sociale INSESO</span>
        </button>

        <button
          onClick={() => setActiveTab('PERMITS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'PERMITS'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Car className="w-4 h-4 text-cyan-400" />
          <span>Titres, Permis & Séjour</span>
        </button>

        <button
          onClick={() => setActiveTab('LEAVES')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'LEAVES'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Calendar className="w-4 h-4 text-amber-400" />
          <span>Congés ({employeeLeaves.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SANCTIONS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'SANCTIONS'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span>Discipline & Sanctions ({employee.totalSanctions || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('NOTES')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'NOTES'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <FileText className="w-4 h-4 text-amber-500" />
          <span>Notes RH {employee.notes ? '•' : ''}</span>
        </button>
      </div>

      {/* TAB CONTENT 1: STATUT RH & SYNTHÈSE */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Compliance Matrix Card */}
            <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Matrice de Conformité Réglementaire RH</span>
              </h3>

              <div className="space-y-3">
                {/* Residence status */}
                <div className="p-3.5 rounded-2xl border border-stone-100 bg-stone-50 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-stone-900">Carte de Résidence / Séjour</p>
                    <p className="text-2xs text-stone-500">
                      {employee.residenceRequired ? (employee.residenceExpiry ? `Expire le ${employee.residenceExpiry}` : 'Requis pour étranger') : 'Non requis (Personnel National)'}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-2xs font-bold ${
                    !employee.residenceRequired
                      ? 'bg-stone-200 text-stone-700'
                      : employee.residenceState === 'VALIDE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : employee.residenceState === 'A_RENOUVELER'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {employee.residenceRequired ? (employee.residenceState || 'EN COURS') : 'NON REQUIS'}
                  </span>
                </div>

                {/* Work permit status */}
                <div className="p-3.5 rounded-2xl border border-stone-100 bg-stone-50 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-stone-900">Permis de Travail (Ministère du Travail)</p>
                    <p className="text-2xs text-stone-500">
                      {employee.workPermitRequired ? (employee.workPermitNumber ? `N° ${employee.workPermitNumber} - Expire ${employee.workPermitExpiry || 'N/A'}` : 'Permis requis') : 'Non requis'}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-2xs font-bold ${
                    !employee.workPermitRequired
                      ? 'bg-stone-200 text-stone-700'
                      : employee.workPermitState === 'VALIDE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : employee.workPermitState === 'A_RENOUVELER'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {employee.workPermitRequired ? (employee.workPermitState || 'EN COURS') : 'NON REQUIS'}
                  </span>
                </div>

                {/* Driving Licence */}
                <div className="p-3.5 rounded-2xl border border-stone-100 bg-stone-50 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-stone-900">Permis de Conduire Professionnel</p>
                    <p className="text-2xs text-stone-500">
                      {employee.drivingLicenceRequired ? (employee.drivingLicenceNumber ? `Permis N° ${employee.drivingLicenceNumber}` : 'Obligatoire pour poste conduite') : 'Non applicable'}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-2xs font-bold ${
                    !employee.drivingLicenceRequired
                      ? 'bg-stone-200 text-stone-700'
                      : employee.drivingLicenceState === 'VALIDE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : employee.drivingLicenceState === 'A_RENOUVELER'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {employee.drivingLicenceRequired ? (employee.drivingLicenceState || 'EN COURS') : 'NON REQUIS'}
                  </span>
                </div>

                {/* INSESO Affiliation */}
                <div className="p-3.5 rounded-2xl border border-stone-100 bg-stone-50 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-stone-900">Affiliation INSESO (Caisse Sécurité Sociale)</p>
                    <p className="text-2xs text-stone-500">
                      {employee.ssNumber ? `N° Matricule INSESO: ${employee.ssNumber}` : 'En cours d\'immatriculation'}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-2xs font-bold ${
                    employee.isInsured ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {employee.isInsured ? 'AFFILIÉ & COTISANT' : 'NON DÉCLARÉ'}
                  </span>
                </div>
              </div>
            </div>

            {/* Contract & Cycle Summary Card */}
            <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-purple-600" />
                <span>Régime Contractuel & Droits à Congés</span>
              </h3>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-700">Type de Contrat</span>
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-stone-200 text-stone-800">
                    {employee.contractType}
                  </span>
                </div>

                <div className="text-2xs text-stone-600 space-y-1 bg-white p-3 rounded-xl border border-stone-200/80">
                  {employee.contractType === 'TYPE_A' ? (
                    <>
                      <p className="font-bold text-emerald-800">• Contrat Rotatif / Cycle 6 Mois :</p>
                      <p>30 jours de congés acquis tous les 6 mois (182.5 jours). Après 5 mois consécutifs de travail, le collaborateur prend le 6e mois complet en congés (30 jours). Taux d'acquisition : ~0.1967 j/jour travaillé (6 jours par mois travaillé).</p>
                    </>
                  ) : (
                    <>
                      <p className="font-bold text-blue-800">• Contrat Annuel Standard / Cycle 12 Mois :</p>
                      <p>30 jours de congés acquis par an (365 jours). Après 11 mois de travail effectif, le collaborateur prend le 12e mois en congés annuels (30 jours). Taux d'acquisition : ~0.0896 j/jour travaillé (~2.73 jours par mois travaillé).</p>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-2xs">
                  <div className="p-2.5 rounded-xl bg-white border border-stone-200">
                    <span className="text-stone-400 block">Jours Travaillés Évalués</span>
                    <span className="text-sm font-extrabold text-stone-900 font-mono">
                      {stats.daysWorked} j
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-stone-200">
                    <span className="text-stone-400 block">Cycles Complets Effectués</span>
                    <span className="text-sm font-extrabold text-stone-900 font-mono">
                      {Math.floor(stats.daysWorked / (employee.contractType === 'TYPE_A' ? 182.5 : 365))} cycle(s)
                    </span>
                  </div>
                </div>
              </div>

              {/* Open points checklist */}
              {(((employee.openItemsToComplete || 0) > 0) || ((employee.openItemsToVerify || 0) > 0)) && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-2xs text-amber-900 space-y-1">
                  <span className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                    Contrôle Audit RH :
                  </span>
                  <p>• {employee.openItemsToComplete} élément(s) à compléter</p>
                  <p>• {employee.openItemsToVerify} point(s) à vérifier</p>
                </div>
              )}
            </div>
          </div>

          {/* Embedded Employee Notes Area */}
          <EmployeeNotesArea
            employee={employee}
            onUpdateEmployee={onUpdateEmployee}
          />
        </div>
      )}

      {/* TAB CONTENT 2: DOCUMENTS & PIÈCES JOINTES */}
      {activeTab === 'DOCUMENTS' && (
        <div className="space-y-6">
          {/* Document Upload Dropzone & Action */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Dossier Numérique des Pièces Justificatives</span>
                </h3>
                <p className="text-2xs text-stone-500 mt-0.5">
                  Archivage sécurisé des contrats, pièces d'identité, permis de travail, titres de séjour et certificats.
                </p>
              </div>

              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Nouveau Document</span>
              </button>
            </div>

            {/* Drag & Drop Quick Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => setIsUploadModalOpen(true)}
              className={`p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-stone-900 bg-stone-100 scale-99'
                  : 'border-stone-200 bg-stone-50/70 hover:bg-stone-50 hover:border-stone-300'
              }`}
            >
              <Upload className="w-8 h-8 text-stone-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-stone-800">
                Glissez-déposez un document ici, ou <span className="text-blue-600 underline">cliquez pour sélectionner</span>
              </p>
              <p className="text-3xs text-stone-400 mt-1">
                Formats acceptés : PDF, PNG, JPG, DOCX (Taille max recommandée : 15 Mo)
              </p>
            </div>
          </div>

          {/* List of Documents */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
            <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              Documents Archivés ({(employee.documents || []).length})
            </h4>

            {(!employee.documents || employee.documents.length === 0) ? (
              <div className="p-8 text-center bg-stone-50 rounded-2xl border border-stone-100">
                <FileSpreadsheet className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-stone-700">Aucun document classé pour le moment</p>
                <p className="text-2xs text-stone-400 mt-0.5">Téléversez les justificatifs légaux ou contractuels du collaborateur.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {employee.documents.map((doc) => {
                  const catInfo = CATEGORY_LABELS[doc.category] || CATEGORY_LABELS.AUTRE;
                  return (
                    <div
                      key={doc.id}
                      className="p-4 rounded-2xl border border-stone-200 bg-stone-50/50 hover:bg-white transition-all flex flex-col justify-between gap-3 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-stone-900 group-hover:text-blue-700 transition-colors line-clamp-1">
                              {doc.name}
                            </p>
                            <span className={`inline-block px-2 py-0.5 rounded text-3xs font-bold mt-1 border ${catInfo.color}`}>
                              {catInfo.label}
                            </span>
                            {doc.notes && (
                              <p className="text-2xs text-stone-500 mt-1 italic">
                                {doc.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="text-stone-300 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                          title="Supprimer ce document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-3xs text-stone-400">
                        <span>Ajouté le {new Date(doc.uploadDate).toLocaleDateString('fr-FR')} • {(doc.size / 1024).toFixed(0)} Ko</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setPreviewDocument(doc)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-200/70 hover:bg-stone-300 text-stone-800 font-bold transition-colors cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Visualiser</span>
                          </button>
                          {doc.fileData && (
                            <a
                              href={doc.fileData}
                              download={doc.name}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-bold transition-colors cursor-pointer"
                            >
                              <Download className="w-3 h-3" />
                              <span>Télécharger</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: ÉTAT CIVIL & COORDONNÉES */}
      {activeTab === 'PERSONAL' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-stone-100">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" />
              <span>Fiche Individuelle d'État Civil & Coordonnées</span>
            </h3>

            <button
              onClick={() => handleOpenEditModal('IDENTITY')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-stone-800 bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-stone-600" />
              <span>Modifier l'état civil & coordonnées</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
              <span className="text-3xs font-bold text-stone-400 uppercase">Nom & Prénoms complets</span>
              <p className="font-bold text-stone-900">{employee.name}</p>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
              <span className="text-3xs font-bold text-stone-400 uppercase">Prénoms (Given Names)</span>
              <p className="font-semibold text-stone-800">{employee.givenNames || 'N/A'}</p>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
              <span className="text-3xs font-bold text-stone-400 uppercase">Noms de Famille (Surnames)</span>
              <p className="font-semibold text-stone-800">{employee.surnames || 'N/A'}</p>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
              <span className="text-3xs font-bold text-stone-400 uppercase">Sexe</span>
              <p className="font-semibold text-stone-800">{employee.sex === 'M' ? 'Masculin (M)' : employee.sex === 'F' ? 'Féminin (F)' : 'Non renseigné'}</p>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
              <span className="text-3xs font-bold text-stone-400 uppercase">Date de Naissance & Âge</span>
              <p className="font-semibold text-stone-800">
                {employee.birthDate ? `${employee.birthDate} (${employee.age ? `${employee.age} ans` : ''})` : (employee.birthYear ? `Année ${employee.birthYear}` : 'N/A')}
              </p>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
              <span className="text-3xs font-bold text-stone-400 uppercase">Nationalité & Pays</span>
              <p className="font-semibold text-stone-800">
                {employee.nationality || 'Non spécifiée'} {employee.nationalityCountry ? `(${employee.nationalityCountry})` : ''}
              </p>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
              <span className="text-3xs font-bold text-stone-400 uppercase">Situation Matrimoniale</span>
              <p className="font-semibold text-stone-800">{employee.maritalStatus || 'Non spécifié'}</p>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
              <span className="text-3xs font-bold text-stone-400 uppercase">Nombre d'enfants à charge</span>
              <p className="font-semibold text-stone-800">{employee.childrenCount !== undefined && employee.childrenCount !== null ? `${employee.childrenCount} enfant(s)` : '0'}</p>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
              <span className="text-3xs font-bold text-stone-400 uppercase">Niveau d'Études / Formation</span>
              <p className="font-semibold text-stone-800">{employee.educationLevel || 'Non spécifié'}</p>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
              <span className="text-3xs font-bold text-stone-400 uppercase">Adresse / Quartier de Résidence</span>
              <div className="pt-0.5">
                <ConfidentialMask
                  value={employee.address}
                  type="address"
                  fieldKey={`emp-${employee.id}-addr`}
                  fieldLabel="Adresse personnelle"
                />
              </div>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
              <span className="text-3xs font-bold text-stone-400 uppercase">Téléphone Principal (Tél 1)</span>
              <div className="pt-0.5">
                <ConfidentialMask
                  value={employee.phone1}
                  type="phone"
                  fieldKey={`emp-${employee.id}-phone1`}
                  fieldLabel="Téléphone 1"
                />
              </div>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
              <span className="text-3xs font-bold text-stone-400 uppercase">Téléphone Secondaire (Tél 2)</span>
              <div className="pt-0.5">
                <ConfidentialMask
                  value={employee.phone2}
                  type="phone"
                  fieldKey={`emp-${employee.id}-phone2`}
                  fieldLabel="Téléphone 2"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100">
            <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-3">
              Pièce d'Identité Officielle
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
                <span className="text-3xs font-bold text-stone-400 uppercase">Type de Pièce</span>
                <p className="font-bold text-stone-900">{employee.idDocumentType || 'DIP / Passeport'}</p>
              </div>
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
                <span className="text-3xs font-bold text-stone-400 uppercase">Numéro de Document</span>
                <div className="pt-0.5">
                  <ConfidentialMask
                    value={employee.idDocumentNumber}
                    type="id"
                    fieldKey={`emp-${employee.id}-docnum`}
                    fieldLabel="Numéro de Pièce"
                  />
                </div>
              </div>
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
                <span className="text-3xs font-bold text-stone-400 uppercase">Numéro Enregistré INSESO</span>
                <div className="pt-0.5">
                  <ConfidentialMask
                    value={employee.idDocumentNumberAtInseso || employee.idDocumentNumber}
                    type="id"
                    fieldKey={`emp-${employee.id}-docinseso`}
                    fieldLabel="Numéro INSESO"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: CONTRAT & AFFECTATION */}
      {activeTab === 'CONTRACT' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-stone-100">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-purple-600" />
              <span>Données Contractuelles & Primes</span>
            </h3>

            <button
              onClick={() => handleOpenEditModal('CONTRACT')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-stone-800 bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-stone-600" />
              <span>Modifier le poste & contrat</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
              <span className="text-3xs font-bold text-stone-400 uppercase">Intitulé du Poste / Métier</span>
              <p className="font-bold text-stone-900">{employee.position}</p>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
              <span className="text-3xs font-bold text-stone-400 uppercase">Département d'Affection</span>
              <p className="font-semibold text-stone-800">{employee.department || 'Non spécifié'}</p>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
              <span className="text-3xs font-bold text-stone-400 uppercase">Site Opérationnel</span>
              <p className="font-semibold text-stone-800">{employee.site || 'Site Principal'}</p>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
              <span className="text-3xs font-bold text-stone-400 uppercase">Date d'Embauche</span>
              <p className="font-semibold text-stone-800">{new Date(employee.hireDate).toLocaleDateString('fr-FR')}</p>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
              <span className="text-3xs font-bold text-stone-400 uppercase">Début du Contrat</span>
              <p className="font-semibold text-stone-800">{employee.contractStartDate || employee.hireDate}</p>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
              <span className="text-3xs font-bold text-stone-400 uppercase">Statut du Contrat</span>
              <p className="font-bold text-emerald-800">{employee.contractStatus || 'EN COURS (CDI)'}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100">
            <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-3">
              Indemnités & Primes Spécifiques
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className={`p-4 rounded-2xl border ${employee.allowanceFood ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-stone-50 border-stone-200 text-stone-600'}`}>
                <span className="font-bold block">Prime de Repas (Comida)</span>
                <span className="text-2xs">{employee.allowanceFood ? 'Attribuée (Active)' : 'Non applicable'}</span>
              </div>
              <div className={`p-4 rounded-2xl border ${employee.allowanceSpecial ? 'bg-purple-50 border-purple-200 text-purple-900' : 'bg-stone-50 border-stone-200 text-stone-600'}`}>
                <span className="font-bold block">Indemnité Spéciale (Responsabilité)</span>
                <span className="text-2xs">{employee.allowanceSpecial ? 'Attribuée (Cadre / Superviseur)' : 'Non applicable'}</span>
              </div>
              <div className={`p-4 rounded-2xl border ${employee.allowanceHousing ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-stone-50 border-stone-200 text-stone-600'}`}>
                <span className="font-bold block">Indemnité de Logement (Vivienda)</span>
                <span className="text-2xs">{employee.allowanceHousing ? 'Attribuée (Expatriation / Mutation)' : 'Non applicable'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: SÉCURITÉ SOCIALE & INSESO */}
      {activeTab === 'INSESO' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-stone-100">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-teal-600" />
              <span>Sécurité Sociale INSESO (Institut National de Sécurité Sociale)</span>
            </h3>

            <button
              onClick={() => handleOpenEditModal('INSESO')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-stone-800 bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-stone-600" />
              <span>Modifier les données INSESO</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
              <span className="text-3xs font-bold text-stone-400 uppercase">N° Sécurité Sociale INSESO</span>
              <div className="pt-0.5">
                <ConfidentialMask
                  value={employee.ssNumber}
                  type="ss"
                  fieldKey={`emp-${employee.id}-ssnumber`}
                  fieldLabel="N° Sécurité Sociale INSESO"
                />
              </div>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
              <span className="text-3xs font-bold text-stone-400 uppercase">N° de Séquence Registre</span>
              <p className="font-mono font-semibold text-stone-800">{employee.insesoSequenceNumber ? `#${employee.insesoSequenceNumber}` : 'N/A'}</p>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
              <span className="text-3xs font-bold text-stone-400 uppercase">Date Inscription INSESO</span>
              <p className="font-semibold text-stone-800">{employee.insesoDate || 'N/A'}</p>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
              <span className="text-3xs font-bold text-stone-400 uppercase">Statut Cotisation</span>
              <p className="font-bold text-emerald-800">{employee.isInsured ? 'Assuré en règle (Cotisant)' : 'Non affilié'}</p>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
              <span className="text-3xs font-bold text-stone-400 uppercase">Vérification N° Document</span>
              <p className="font-mono font-semibold text-stone-700">{employee.idDocumentNumberAtInseso || employee.idDocumentNumber || 'Conforme'}</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 6: TITRES, PERMIS & SÉJOUR */}
      {activeTab === 'PERMITS' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-stone-100">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Car className="w-4 h-4 text-cyan-600" />
              <span>Titres de Séjour, Permis de Travail & Permis de Conduire</span>
            </h3>

            <button
              onClick={() => handleOpenEditModal('PERMITS')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-stone-800 bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-stone-600" />
              <span>Modifier titres & permis</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Permis de travail */}
            <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-900">Permis de Travail</span>
                <span className={`px-2 py-0.5 rounded text-3xs font-bold ${
                  employee.workPermitState === 'VALIDE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {employee.workPermitState || 'NON REQUIS'}
                </span>
              </div>
              <div className="text-2xs text-stone-600 space-y-1 font-mono">
                <div className="flex items-center gap-1">
                  <span>N° Permis :</span>
                  <ConfidentialMask
                    value={employee.workPermitNumber}
                    type="id"
                    fieldKey={`emp-${employee.id}-permitno`}
                    fieldLabel="N° Permis Travail"
                  />
                </div>
                <p>Date émission : {employee.workPermitStart || 'N/A'}</p>
                <p>Date expiration : <strong>{employee.workPermitExpiry || 'N/A'}</strong></p>
              </div>
            </div>

            {/* Titre de séjour */}
            <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-900">Carte de Résidence</span>
                <span className={`px-2 py-0.5 rounded text-3xs font-bold ${
                  employee.residenceState === 'VALIDE' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                }`}>
                  {employee.residenceState || 'NON REQUIS'}
                </span>
              </div>
              <div className="text-2xs text-stone-600 space-y-1 font-mono">
                <p>Statut légal : <strong>{employee.isForeign ? 'Ressortissant Étranger' : 'National'}</strong></p>
                <p>Début validité : {employee.residenceStart || 'N/A'}</p>
                <p>Date expiration : <strong>{employee.residenceExpiry || 'N/A'}</strong></p>
              </div>
            </div>

            {/* Permis de conduire */}
            <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-900">Permis de Conduire</span>
                <span className={`px-2 py-0.5 rounded text-3xs font-bold ${
                  employee.drivingLicenceState === 'VALIDE' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'
                }`}>
                  {employee.drivingLicenceState || 'NON REQUIS'}
                </span>
              </div>
              <div className="text-2xs text-stone-600 space-y-1 font-mono">
                <div className="flex items-center gap-1">
                  <span>N° Permis :</span>
                  <ConfidentialMask
                    value={employee.drivingLicenceNumber}
                    type="id"
                    fieldKey={`emp-${employee.id}-drivelic`}
                    fieldLabel="N° Permis Conduire"
                  />
                </div>
                <p>Délivrance : {employee.drivingLicenceStart || 'N/A'}</p>
                <p>Échéance : <strong>{employee.drivingLicenceExpiry || 'N/A'}</strong></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 7: CONGÉS & ABSENCES */}
      {activeTab === 'LEAVES' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500" />
              <span>Historique & Solde des Congés</span>
            </h3>

            <button
              onClick={() => onOpenLeaveModal(employee.id)}
              className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Saisir une Absence / Congé</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <span className="text-3xs font-bold text-stone-400 uppercase">Jours Acquis par le Travail</span>
              <p className="text-xl font-bold font-mono text-emerald-700 mt-1">+{stats.totalAccruedDays.toFixed(1)} j</p>
            </div>
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <span className="text-3xs font-bold text-stone-400 uppercase">Congés Payés Consommés</span>
              <p className="text-xl font-bold font-mono text-stone-900 mt-1">{stats.totalLeaveTakenDays} j</p>
            </div>
            <div className={`p-4 rounded-2xl border ${stats.isDebt ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <span className="text-3xs font-bold uppercase text-stone-500">Solde Net Restant</span>
              <p className={`text-xl font-bold font-mono mt-1 ${stats.isDebt ? 'text-red-700' : 'text-emerald-700'}`}>
                {stats.isDebt ? `-${stats.debtDays.toFixed(1)} j` : `+${stats.balanceDays.toFixed(1)} j`}
              </p>
            </div>
          </div>

          {employeeLeaves.length === 0 ? (
            <div className="p-8 text-center bg-stone-50 rounded-2xl border border-stone-100">
              <p className="text-xs font-bold text-stone-700">Aucun congé ou absence enregistré</p>
              <p className="text-2xs text-stone-400 mt-0.5">Utilisez le bouton ci-dessus pour saisir un congé payé ou une absence.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {employeeLeaves.map((rec) => (
                <div key={rec.id} className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 text-xs flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900">{LEAVE_TYPE_LABELS[rec.leaveType]}</span>
                      {rec.isPaid === false ? (
                        <span className="px-2 py-0.5 rounded text-3xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                          Sans solde
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-3xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                          Payé
                        </span>
                      )}
                    </div>
                    <p className="text-2xs text-stone-500 mt-0.5">
                      Du {new Date(rec.startDate).toLocaleDateString('fr-FR')} au {new Date(rec.endDate).toLocaleDateString('fr-FR')} {rec.notes ? `• ${rec.notes}` : ''}
                    </p>
                  </div>
                  <span className="font-bold font-mono text-stone-900 text-sm">
                    {rec.daysCount} jours
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 8: DISCIPLINE & SANCTIONS */}
      {activeTab === 'SANCTIONS' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-xs space-y-6">
          <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>Dossier Disciplinaire & Sanctions</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
              <span className="text-3xs font-bold text-stone-400 uppercase">Total Sanctions Émises</span>
              <p className="text-xl font-bold font-mono text-stone-900">{employee.totalSanctions || 0}</p>
            </div>
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
              <span className="text-3xs font-bold text-stone-400 uppercase">Total Jours de Suspension</span>
              <p className="text-xl font-bold font-mono text-stone-900">{employee.totalSuspensionDays || 0} jours</p>
            </div>
          </div>

          {employee.totalSanctions && employee.totalSanctions > 0 ? (
            <div className="p-4 bg-red-50/60 border border-red-200 rounded-2xl text-xs space-y-2">
              <p className="font-bold text-red-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                Dernière Mesure Disciplinaire : {employee.lastSanctionType || 'Sanction'} ({employee.lastSanctionDate || 'Date non précisée'})
              </p>
              <p className="text-2xs text-red-800 pl-6">
                <strong>Motif enregistré :</strong> {employee.lastSanctionReason || 'Non spécifié'}
              </p>
            </div>
          ) : (
            <div className="p-8 text-center bg-stone-50 rounded-2xl border border-stone-100">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-stone-800">Dossier Disciplinaire Vierge</p>
              <p className="text-2xs text-stone-400 mt-0.5">Aucune sanction ou avertissement enregistré pour ce collaborateur.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 9: NOTES & REMARQUES RH */}
      {activeTab === 'NOTES' && (
        <div className="space-y-6">
          <EmployeeNotesArea
            employee={employee}
            onUpdateEmployee={onUpdateEmployee}
          />
        </div>
      )}

      {/* MODAL: Upload Document */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Téléverser une Pièce Jointe</h3>
                  <p className="text-2xs text-stone-500">Pour le dossier de {employee.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Dropzone inside modal */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-stone-900 bg-stone-100'
                    : 'border-stone-200 bg-stone-50 hover:bg-stone-100/70'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                <Upload className="w-6 h-6 text-stone-400 mx-auto mb-1.5" />
                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="font-bold text-stone-900">{selectedFile.name}</p>
                    <p className="text-3xs text-stone-500">{(selectedFile.size / 1024).toFixed(0)} Ko • Fichier sélectionné</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-stone-800">Glissez le fichier ici ou cliquez pour parcourir</p>
                    <p className="text-3xs text-stone-400 mt-0.5">PDF, Word, Images acceptés</p>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-2xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Nom du document *
                </label>
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="Ex: Copie Passeport, Contrat Avenant..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs bg-stone-50 text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-2xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Catégorie du document *
                </label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value as DocumentCategory)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs bg-stone-50 text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                >
                  {Object.entries(CATEGORY_LABELS).map(([cat, info]) => (
                    <option key={cat} value={cat}>
                      {info.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-2xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Remarques / Références (Optionnel)
                </label>
                <input
                  type="text"
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                  placeholder="Ex: Date d'expiration, numéro de référence..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs bg-stone-50 text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveUploadedDocument}
                disabled={!selectedFile && !docName.trim()}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-stone-900 hover:bg-stone-800 text-white cursor-pointer disabled:opacity-50"
              >
                Enregistrer au Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Preview Document */}
      {previewDocument && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-stone-900">{previewDocument.name}</h3>
              </div>
              <button
                onClick={() => setPreviewDocument(null)}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 text-2xs">
                <div>
                  <span className="text-stone-400 block">Catégorie</span>
                  <span className="font-bold text-stone-800">{CATEGORY_LABELS[previewDocument.category]?.label}</span>
                </div>
                <div>
                  <span className="text-stone-400 block">Date de téléversement</span>
                  <span className="font-mono text-stone-800">{new Date(previewDocument.uploadDate).toLocaleString('fr-FR')}</span>
                </div>
              </div>

              {previewDocument.notes && (
                <div className="p-2.5 bg-white rounded-xl border border-stone-200 text-2xs">
                  <span className="font-bold text-stone-600 block">Notes :</span>
                  <p className="text-stone-800">{previewDocument.notes}</p>
                </div>
              )}

              {previewDocument.fileData ? (
                previewDocument.type.startsWith('image/') ? (
                  <img src={previewDocument.fileData} alt={previewDocument.name} className="max-h-96 mx-auto rounded-xl object-contain" />
                ) : (
                  <div className="p-8 text-center bg-white rounded-xl border border-stone-200">
                    <p className="text-xs font-semibold text-stone-700 mb-2">Aperçu direct du document prêt au téléchargement</p>
                    <a
                      href={previewDocument.fileData}
                      download={previewDocument.name}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold"
                    >
                      <Download className="w-4 h-4" />
                      Télécharger ({previewDocument.name})
                    </a>
                  </div>
                )
              ) : (
                <div className="p-8 text-center bg-white rounded-xl border border-stone-200 text-stone-500 text-xs">
                  Document archivé au registre RH centralisé.
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setPreviewDocument(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-stone-900 text-white cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Adjust HR Status */}
      {isEditingStatus && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-sm font-bold text-stone-900">Ajuster le Statut RH</h3>
              <button
                onClick={() => setIsEditingStatus(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-full hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">Statut d'Emploi</label>
                <select
                  value={statusForm.employmentStatus}
                  onChange={(e) => setStatusForm({ ...statusForm, employmentStatus: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs bg-stone-50"
                >
                  <option value="ACTIF">ACTIF (En poste)</option>
                  <option value="A_CONFIRMER">À CONFIRMER</option>
                  <option value="CONTRAT_TERMINE">CONTRAT TERMINÉ / PARTI</option>
                </select>
              </div>

              <div>
                <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">Statut de Conformité</label>
                <select
                  value={statusForm.overallState}
                  onChange={(e) => setStatusForm({ ...statusForm, overallState: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs bg-stone-50"
                >
                  <option value="EN_REGLE">EN RÈGLE (Dossier conforme)</option>
                  <option value="A_REGULARISER">À RÉGULARISER (Urgence)</option>
                  <option value="A_RENOUVELER">À RENOUVELER (Titre / Permis proche échéance)</option>
                  <option value="A_COMPLETER_VERIFIER">À COMPLÉTER / VÉRIFIER</option>
                  <option value="PARTI">PARTI / DÉPARTS</option>
                </select>
              </div>

              <div>
                <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">Motif du Statut</label>
                <input
                  type="text"
                  value={statusForm.stateReasons}
                  onChange={(e) => setStatusForm({ ...statusForm, stateReasons: e.target.value })}
                  placeholder="Ex: Document de résidence expiré..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs bg-stone-50"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">Points à Contrôler</label>
                <textarea
                  value={statusForm.openItemsDetail}
                  onChange={(e) => setStatusForm({ ...statusForm, openItemsDetail: e.target.value })}
                  rows={2}
                  placeholder="Détails à vérifier avec l'INSESO ou l'intéressé..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs bg-stone-50"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                onClick={() => setIsEditingStatus(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveStatus}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-stone-900 text-white hover:bg-stone-800"
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL EMPLOYEE EDIT MODAL */}
      <EmployeeEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        employee={employee}
        initialTab={editModalInitialTab}
        onSave={(updated) => {
          onUpdateEmployee(updated);
        }}
      />
    </div>
  );
};
