import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  BadgeCheck,
  Globe,
  Building2,
  RefreshCw,
  FileCheck,
  FileCode,
  Layers,
  Edit2,
  Trash2,
} from 'lucide-react';
import { Employee, EmployeeStatus, ContractType } from '@/types';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import {
  parseExcelOrCsvFile,
  downloadEmployeeExcelTemplate,
  normalizeExcelDate,
  ParsedEmployeeRow,
  ParseResult,
} from '@/features/employees/excelImportExport';

interface EmployeeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportEmployees: (employees: Employee[]) => Promise<void>;
  existingEmployees: Employee[];
}

export const EmployeeImportModal: React.FC<EmployeeImportModalProps> = ({
  isOpen,
  onClose,
  onImportEmployees,
  existingEmployees,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedEmployeeRow[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Confirmation modal states
  const [showImportConfirmModal, setShowImportConfirmModal] = useState(false);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);

  if (!isOpen) return null;

  const processSelectedFile = async (selectedFile: File, targetSheet?: string) => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const result = await parseExcelOrCsvFile(selectedFile, targetSheet, existingEmployees);
      setParseResult(result);
      setParsedRows(result.rows);
      setSelectedSheet(result.selectedSheet);
      if (result.rows.length === 0) {
        setErrorMsg(
          'Le fichier ou la feuille sélectionnée ne contient aucune ligne de données exploitable.',
        );
      }
    } catch (err) {
      console.error('Error parsing file:', err);
      setErrorMsg(
        err instanceof Error ? err.message : 'Erreur lors de la lecture du fichier Excel/CSV.',
      );
      setParseResult(null);
      setParsedRows([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      processSelectedFile(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      setFile(selectedFile);
      processSelectedFile(selectedFile);
    }
  };

  const handleSheetChange = (sheetName: string) => {
    if (file && sheetName !== selectedSheet) {
      setSelectedSheet(sheetName);
      processSelectedFile(file, sheetName);
    }
  };

  const handleRowChange = (index: number, field: keyof ParsedEmployeeRow, value: string) => {
    setParsedRows((prev) => {
      return prev.map((row, idx) => {
        if (idx !== index) return row;
        const updated = { ...row, [field]: value };

        // Re-validate row. The hire date must be checked here too: it drives every
        // accrual figure, and without it an edit to any other cell would clear the
        // parser's date error and let the row import with an empty hireDate.
        const validationErrors: string[] = [];
        if (!updated.name || updated.name.trim().length < 2) {
          validationErrors.push('Nom trop court (min. 2 caractères)');
        }
        if (!updated.idNumber || updated.idNumber.trim().length === 0) {
          validationErrors.push('N° Matricule manquant');
        }
        const normalizedHireDate = normalizeExcelDate(updated.hireDate);
        if (!normalizedHireDate) {
          validationErrors.push(
            updated.hireDate
              ? `Date d'embauche illisible : "${updated.hireDate}" (format attendu AAAA-MM-JJ)`
              : "Date d'embauche manquante",
          );
        } else if (normalizedHireDate > new Date().toISOString().split('T')[0]) {
          validationErrors.push(`Date d'embauche dans le futur : ${normalizedHireDate}`);
        }
        updated.isValid = validationErrors.length === 0;
        updated.validationErrors = validationErrors;
        return updated;
      });
    });
  };

  const handleDeleteRow = (index: number) => {
    setParsedRows((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleDownloadCsvTemplate = () => {
    const csvContent =
      '\uFEFF' +
      [
        "N° Matricule RH;Matricule GL (ID Société);Nom & Prénom;Nationalité;Poste / Fonction;Statut (LOCAL ou EXPAT);Date d'Embauche (AAAA-MM-JJ);Type de Contrat (TYPE_A ou TYPE_B)",
        'MAT-0012;GL-1042;Karim Alami;Sénégalaise;Ingénieur Projet Senior;LOCAL;2024-01-15;TYPE_A',
        'MAT-0015;GL-1045;Sophie Laurent;Française;Responsable Ressources Humaines;LOCAL;2024-06-01;TYPE_A',
        'MAT-0020;GL-1050;Jean-Pierre Dubois;Française;Directeur des Opérations;EXPAT;2025-02-10;TYPE_B',
        'MAT-0025;GL-1055;Marc Lemoine;Belge;Superviseur Sécurité Site;EXPAT;2024-09-01;TYPE_A',
        'MAT-0030;GL-1060;Fatima Zahra;Marocaine;Comptable Générale;LOCAL;2023-11-20;TYPE_B',
        'MAT-0035;GL-1065;Alexandre Petit;Française;Chef de Chantier;EXPAT;2024-04-10;TYPE_A',
        'MAT-0040;GL-1070;Mamadou Diallo;Guinéenne;Technicien Électromécanicien;LOCAL;2024-07-01;TYPE_A',
      ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `modele_import_employes_rh_${new Date().toISOString().split('T')[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePreImport = () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      alert('Aucun employé valide à importer. Veuillez corriger les lignes en erreur.');
      return;
    }
    setShowImportConfirmModal(true);
  };

  const handleExecuteImport = async () => {
    setShowImportConfirmModal(false);
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    setIsSubmitting(true);
    try {
      const formattedEmployees: Employee[] = validRows.map((r, i) => {
        // If an existing employee has the same matricule, preserve their id for update, else generate new
        const existing = existingEmployees.find(
          (e) => e.idNumber && e.idNumber.toLowerCase() === r.idNumber.toLowerCase(),
        );

        return {
          id: existing ? existing.id : `emp-${Date.now()}-${i}`,
          idNumber: r.idNumber.trim(),
          matriculeGL: r.matriculeGL?.trim() || '',
          nationality: r.nationality?.trim() || '',
          name: r.name.trim(),
          position: r.position.trim() || 'Collaborateur',
          status: r.status,
          hireDate: r.hireDate,
          contractType: r.contractType,
          createdAt: existing?.createdAt || new Date().toISOString(),
        };
      });

      await onImportEmployees(formattedEmployees);
      onClose();
    } catch (err) {
      console.error('Import failed:', err);
      setErrorMsg("Échec de l'import : " + (err instanceof Error ? err.message : 'Erreur serveur'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;
  const localCount = parsedRows.filter((r) => r.isValid && r.status === 'LOCAL').length;
  const expatCount = parsedRows.filter((r) => r.isValid && r.status === 'EXPAT').length;
  const typeACount = parsedRows.filter((r) => r.isValid && r.contractType === 'TYPE_A').length;
  const typeBCount = parsedRows.filter((r) => r.isValid && r.contractType === 'TYPE_B').length;

  const handleRequestClose = () => {
    if (parsedRows.length > 0) {
      setShowCancelConfirmModal(true);
    } else {
      onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-5xl w-full p-5 sm:p-6 space-y-5 max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-100 pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                <FileSpreadsheet className="w-5 h-5 text-emerald-100" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
                  Importation des Collaborateurs (Excel & CSV)
                </h3>
                <p className="text-2xs sm:text-xs text-stone-500">
                  Prise en charge native des fichiers Excel (.xlsx, .xls, .ods) et CSV avec
                  détection intelligente des colonnes.
                </p>
              </div>
            </div>
            <button
              onClick={handleRequestClose}
              className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="space-y-4 overflow-y-auto flex-1 pr-1">
            {/* Template Download & Guide Banner */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-stone-900">
                    Formats de fichiers et modèles préconfigurés
                  </p>
                  <p className="text-stone-600 mt-0.5 text-2xs sm:text-xs">
                    Colonnes détectées automatiquement : <strong>N° Matricule RH</strong>,{' '}
                    <strong>Matricule GL (ID Société)</strong>, <strong>Nom & Prénom</strong>,{' '}
                    <strong>Nationalité</strong>, <strong>Poste</strong>,{' '}
                    <strong>Statut (LOCAL/EXPAT)</strong>, <strong>Date d'embauche</strong>,{' '}
                    <strong>Contrat (TYPE_A/TYPE_B)</strong>.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={downloadEmployeeExcelTemplate}
                  className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3 py-2 rounded-xl text-2xs shadow-2xs transition-all cursor-pointer active:scale-98"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Modèle Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadCsvTemplate}
                  className="inline-flex items-center gap-1.5 bg-white hover:bg-stone-100 text-stone-800 font-bold px-3 py-2 rounded-xl border border-stone-300 text-2xs shadow-2xs transition-all cursor-pointer active:scale-98"
                >
                  <FileCode className="w-3.5 h-3.5 text-stone-600" />
                  <span>Modèle CSV</span>
                </button>
              </div>
            </div>

            {/* Dropzone Upload */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-stone-300 hover:border-emerald-600 bg-stone-50/70 hover:bg-emerald-50/30 rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.tsv,.txt,.ods"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-stone-200 flex items-center justify-center text-stone-700 group-hover:scale-105 transition-transform">
                <UploadCloud className="w-6 h-6 text-emerald-700" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-stone-900">
                  {file
                    ? file.name
                    : 'Cliquez ou glissez-déposez votre fichier Excel (.xlsx, .xls) ou CSV'}
                </p>
                <p className="text-2xs text-stone-500 mt-0.5">
                  Formats acceptés : Microsoft Excel (.xlsx, .xls), OpenDocument (.ods), CSV, TSV
                  {file && ` • ${(file.size / 1024).toFixed(1)} KB`}
                </p>
              </div>
            </div>

            {/* Loading Indicator */}
            {isProcessing && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center gap-3 text-xs text-emerald-900 font-semibold">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-700" />
                <span>Analyse du classeur Excel et extraction des lignes en cours...</span>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Sheet Selector (for multi-sheet workbooks) */}
            {parseResult && parseResult.sheetNames.length > 1 && (
              <div className="flex items-center gap-2 p-2.5 bg-stone-100 rounded-xl border border-stone-200 text-xs">
                <Layers className="w-4 h-4 text-stone-600 shrink-0" />
                <span className="font-bold text-stone-700">Feuille Excel active :</span>
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {parseResult.sheetNames.map((sheet) => (
                    <button
                      key={sheet}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSheetChange(sheet);
                      }}
                      className={`px-3 py-1 rounded-lg text-2xs font-bold transition-all cursor-pointer ${
                        selectedSheet === sheet
                          ? 'bg-stone-900 text-white shadow-2xs'
                          : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-200'
                      }`}
                    >
                      {sheet}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Parsed Preview Table */}
            {parsedRows.length > 0 && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-700" />
                    <h4 className="text-xs sm:text-sm font-bold text-stone-900">
                      Aperçu des Données Extraites ({parsedRows.length} lignes)
                    </h4>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-2xs">
                    <span className="bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-200">
                      {validCount} Valide(s)
                    </span>
                    {invalidCount > 0 && (
                      <span className="bg-red-50 text-red-800 font-bold px-2 py-0.5 rounded border border-red-200">
                        {invalidCount} En erreur
                      </span>
                    )}
                    <span className="bg-teal-50 text-teal-800 font-bold px-2 py-0.5 rounded border border-teal-200">
                      {localCount} Local
                    </span>
                    <span className="bg-purple-50 text-purple-800 font-bold px-2 py-0.5 rounded border border-purple-200">
                      {expatCount} Expat
                    </span>
                    <span className="bg-stone-100 text-stone-700 font-bold px-2 py-0.5 rounded border border-stone-200">
                      Type A: {typeACount} | Type B: {typeBCount}
                    </span>
                  </div>
                </div>

                <div className="border border-stone-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-stone-100 text-stone-600 font-bold sticky top-0 uppercase text-[10px] tracking-wider z-10 shadow-2xs">
                      <tr>
                        <th className="py-2.5 px-3">Statut</th>
                        <th className="py-2.5 px-3">N° Matricule RH</th>
                        <th className="py-2.5 px-3">Matricule GL</th>
                        <th className="py-2.5 px-3">Nom & Prénom</th>
                        <th className="py-2.5 px-3">Nationalité</th>
                        <th className="py-2.5 px-3">Poste / Fonction</th>
                        <th className="py-2.5 px-3">Statut Contrat</th>
                        <th className="py-2.5 px-3">Date Embauche</th>
                        <th className="py-2.5 px-3">Cycle Congés</th>
                        <th className="py-2.5 px-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {parsedRows.map((row, idx) => {
                        const isEditing = editingRowIndex === idx;

                        return (
                          <tr
                            key={idx}
                            className={row.isValid ? 'hover:bg-stone-50/80' : 'bg-red-50/50'}
                          >
                            {/* Validity */}
                            <td className="py-2 px-3 whitespace-nowrap">
                              {row.isValid ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-2xs">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  OK
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 text-red-700 font-bold text-2xs"
                                  title={row.validationErrors.join(', ')}
                                >
                                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                                  <span>{row.validationErrors[0] || 'Erreur'}</span>
                                </span>
                              )}
                            </td>

                            {/* Matricule RH */}
                            <td className="py-2 px-3 font-mono font-bold text-stone-900">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={row.idNumber}
                                  onChange={(e) => handleRowChange(idx, 'idNumber', e.target.value)}
                                  className="w-24 px-1.5 py-0.5 border border-stone-300 rounded font-mono text-xs"
                                />
                              ) : (
                                <div className="flex items-center gap-1">
                                  <span>{row.idNumber}</span>
                                  {row.isDuplicateId && (
                                    <span
                                      className="text-[9px] bg-amber-100 text-amber-900 px-1 py-0.2 rounded font-bold border border-amber-300"
                                      title="Matricule déjà existant en base de données (sera mis à jour)"
                                    >
                                      MAJ
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Matricule GL */}
                            <td className="py-2 px-3 font-mono font-bold text-stone-800">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={row.matriculeGL}
                                  placeholder="GL-0000"
                                  onChange={(e) =>
                                    handleRowChange(idx, 'matriculeGL', e.target.value)
                                  }
                                  className="w-24 px-1.5 py-0.5 border border-stone-300 rounded font-mono text-xs"
                                />
                              ) : row.matriculeGL ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-800 border border-stone-200">
                                  {row.matriculeGL}
                                </span>
                              ) : (
                                <span className="text-stone-300 italic text-[11px]">—</span>
                              )}
                            </td>

                            {/* Nom & Prénom */}
                            <td className="py-2 px-3 font-semibold text-stone-900">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={row.name}
                                  onChange={(e) => handleRowChange(idx, 'name', e.target.value)}
                                  className="w-36 px-1.5 py-0.5 border border-stone-300 rounded text-xs"
                                />
                              ) : (
                                row.name || (
                                  <span className="text-red-500 italic">Non renseigné</span>
                                )
                              )}
                            </td>

                            {/* Nationalité */}
                            <td className="py-2 px-3 text-stone-700">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={row.nationality}
                                  placeholder="ex: Sénégalaise"
                                  onChange={(e) =>
                                    handleRowChange(idx, 'nationality', e.target.value)
                                  }
                                  className="w-28 px-1.5 py-0.5 border border-stone-300 rounded text-xs"
                                />
                              ) : row.nationality ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-800">
                                  <Globe className="w-3 h-3 text-stone-500" />
                                  {row.nationality}
                                </span>
                              ) : (
                                <span className="text-stone-300 italic text-[11px]">—</span>
                              )}
                            </td>

                            {/* Poste */}
                            <td className="py-2 px-3 text-stone-600">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={row.position}
                                  onChange={(e) => handleRowChange(idx, 'position', e.target.value)}
                                  className="w-32 px-1.5 py-0.5 border border-stone-300 rounded text-xs"
                                />
                              ) : (
                                row.position
                              )}
                            </td>

                            {/* Statut (LOCAL / EXPAT) */}
                            <td className="py-2 px-3">
                              {isEditing ? (
                                <select
                                  value={row.status}
                                  onChange={(e) =>
                                    handleRowChange(idx, 'status', e.target.value as EmployeeStatus)
                                  }
                                  className="px-1.5 py-0.5 border border-stone-300 rounded text-xs"
                                >
                                  <option value="LOCAL">LOCAL</option>
                                  <option value="EXPAT">EXPAT</option>
                                </select>
                              ) : row.status === 'EXPAT' ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                                  <Globe className="w-2.5 h-2.5 text-purple-600" />
                                  EXPAT
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-900 border border-teal-300">
                                  <Building2 className="w-2.5 h-2.5 text-teal-600" />
                                  LOCAL
                                </span>
                              )}
                            </td>

                            {/* Date Embauche */}
                            <td className="py-2 px-3 font-mono text-stone-700">
                              {isEditing ? (
                                <input
                                  type="date"
                                  value={row.hireDate}
                                  onChange={(e) => handleRowChange(idx, 'hireDate', e.target.value)}
                                  className="px-1.5 py-0.5 border border-stone-300 rounded text-xs"
                                />
                              ) : (
                                row.hireDate
                              )}
                            </td>

                            {/* Contrat */}
                            <td className="py-2 px-3">
                              {isEditing ? (
                                <select
                                  value={row.contractType}
                                  onChange={(e) =>
                                    handleRowChange(
                                      idx,
                                      'contractType',
                                      e.target.value as ContractType,
                                    )
                                  }
                                  className="px-1.5 py-0.5 border border-stone-300 rounded text-xs"
                                >
                                  <option value="TYPE_A">Type A (6m)</option>
                                  <option value="TYPE_B">Type B (1an)</option>
                                </select>
                              ) : row.contractType === 'TYPE_A' ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  TYPE A (6m)
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                  TYPE B (1an)
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-2 px-2 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingRowIndex(isEditing ? null : idx)}
                                  className="p-1 text-stone-500 hover:text-stone-900 rounded hover:bg-stone-100 transition-colors"
                                  title={isEditing ? 'Valider' : 'Modifier'}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRow(idx)}
                                  className="p-1 text-red-500 hover:text-red-700 rounded hover:bg-red-50 transition-colors"
                                  title="Supprimer la ligne"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between border-t border-stone-100 pt-4 shrink-0">
            <button
              type="button"
              onClick={handleRequestClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
            >
              Annuler
            </button>

            <button
              type="button"
              disabled={validCount === 0 || isSubmitting || isProcessing}
              onClick={handlePreImport}
              className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed active:scale-98"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Enregistrement dans Cloud Firestore...</span>
                </>
              ) : (
                <>
                  <BadgeCheck className="w-4 h-4 text-emerald-400" />
                  <span>Valider et Importer {validCount} Collaborateur(s)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal before Import */}
      <ConfirmModal
        isOpen={showImportConfirmModal}
        title={`Importer ${validCount} collaborateur(s) dans Firestore ?`}
        subtitle="Ces employés seront synchronisés en base de données et leurs droits à congés calculés automatiquement."
        type="save"
        confirmLabel={`Confirmer l'import (${validCount} employés)`}
        cancelLabel="Vérifier la liste"
        summaryItems={[
          { label: 'Total employés valides', value: `${validCount}` },
          { label: 'Personnel Local (LOCAL)', value: `${localCount}` },
          { label: 'Expatriés (EXPAT)', value: `${expatCount}` },
          { label: 'Cycle Type A (6 mois)', value: `${typeACount}` },
          { label: 'Cycle Type B (12 mois)', value: `${typeBCount}` },
        ]}
        onConfirm={handleExecuteImport}
        onCancel={() => setShowImportConfirmModal(false)}
      />

      {/* Confirmation Modal when Cancelling */}
      <ConfirmModal
        isOpen={showCancelConfirmModal}
        title="Abandonner l'importation ?"
        subtitle="Le fichier analysé contient des collaborateurs en attente d'importation."
        type="warning"
        confirmLabel="Quitter sans importer"
        cancelLabel="Poursuivre l'import"
        warningMessage="Les lignes analysées ne seront pas enregistrées dans Firestore."
        onConfirm={() => {
          setShowCancelConfirmModal(false);
          onClose();
        }}
        onCancel={() => setShowCancelConfirmModal(false)}
      />
    </>
  );
};
