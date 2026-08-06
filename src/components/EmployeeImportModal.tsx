import React, { useState, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  Users, 
  BadgeCheck, 
  Briefcase, 
  Globe, 
  Building2, 
  ArrowRight,
  RefreshCw,
  FileCheck
} from 'lucide-react';
import Papa from 'papaparse';
import { Employee, EmployeeStatus, ContractType } from '../types';

interface EmployeeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportEmployees: (employees: Employee[]) => Promise<void>;
  existingEmployees: Employee[];
}

interface ParsedEmployeeRow {
  raw: any;
  idNumber: string;
  name: string;
  position: string;
  status: EmployeeStatus;
  hireDate: string;
  contractType: ContractType;
  isValid: boolean;
  validationErrors: string[];
}

export const EmployeeImportModal: React.FC<EmployeeImportModalProps> = ({
  isOpen,
  onClose,
  onImportEmployees,
  existingEmployees,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedEmployeeRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importMode, setImportMode] = useState<'append' | 'overwrite'>('append');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const normalizeDate = (dateStr: string): string => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    const cleaned = dateStr.trim();
    
    // Check YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
      return cleaned;
    }
    
    // Check DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }

    // Attempt Date parse
    const parsed = new Date(cleaned);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    return new Date().toISOString().split('T')[0];
  };

  const normalizeStatus = (statusStr: string): EmployeeStatus => {
    if (!statusStr) return 'LOCAL';
    const s = statusStr.trim().toUpperCase();
    if (s.includes('EXPAT')) return 'EXPAT';
    if (s.includes('LOCAL') || s.includes('NATIONAL')) return 'LOCAL';
    return 'LOCAL';
  };

  const normalizeContract = (contractStr: string): ContractType => {
    if (!contractStr) return 'TYPE_A';
    const c = contractStr.trim().toUpperCase();
    if (c.includes('TYPE_B') || c.includes('TYPE B') || c.includes('ANNUEL') || c.includes('12 MOIS') || c.includes('1 AN') || c === 'B') {
      return 'TYPE_B';
    }
    return 'TYPE_A';
  };

  const parseFileContent = (fileToParse: File) => {
    setIsProcessing(true);
    setErrorMsg(null);

    Papa.parse(fileToParse, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          setErrorMsg("Le fichier sélectionné est vide ou illisible.");
          setIsProcessing(false);
          return;
        }

        const rows: ParsedEmployeeRow[] = [];

        results.data.forEach((row: any, index: number) => {
          // Normalize column headers matching
          const keys = Object.keys(row);
          
          const findVal = (possibleKeys: string[]): string => {
            for (const key of keys) {
              const cleanKey = key.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
              for (const pk of possibleKeys) {
                if (cleanKey.includes(pk)) {
                  return String(row[key] || '').trim();
                }
              }
            }
            return '';
          };

          const idNumber = findVal(['matricule', 'id_number', 'idnumber', 'n°', 'num', 'code', 'id']) || `MAT-${String(index + 1).padStart(4, '0')}`;
          const name = findVal(['nom & prenom', 'nom prenom', 'nom_prenom', 'nom complet', 'nom', 'name', 'collaborateur', 'employe']) || '';
          const position = findVal(['poste', 'fonction', 'position', 'titre', 'intitule', 'metier', 'role']) || 'Collaborateur RH';
          const rawStatus = findVal(['statut', 'status', 'expat', 'contrat_statut', 'type personnel']);
          const rawDate = findVal(['date d\'embauche', 'date embauche', 'embauche', 'date_embauche', 'hire_date', 'hiredate', 'date']);
          const rawContract = findVal(['contrat', 'type contrat', 'type_contrat', 'contract_type', 'cycle']);

          const status = normalizeStatus(rawStatus);
          const hireDate = normalizeDate(rawDate);
          const contractType = normalizeContract(rawContract);

          const validationErrors: string[] = [];
          if (!name) validationErrors.push("Nom manquant");

          rows.push({
            raw: row,
            idNumber,
            name,
            position,
            status,
            hireDate,
            contractType,
            isValid: validationErrors.length === 0,
            validationErrors,
          });
        });

        setParsedRows(rows);
        setIsProcessing(false);
      },
      error: (err) => {
        console.error("PapaParse error:", err);
        setErrorMsg("Erreur lors de la lecture du fichier : " + err.message);
        setIsProcessing(false);
      }
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      parseFileContent(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      setFile(selectedFile);
      parseFileContent(selectedFile);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = '\uFEFF' + [
      "Matricule;Nom & Prenom;Poste / Fonction;Statut (LOCAL ou EXPAT);Date Embauche (AAAA-MM-JJ);Type Contrat (TYPE_A ou TYPE_B)",
      "MAT-0012;Karim Alami;Ingénieur Projet Senior;LOCAL;2024-01-15;TYPE_A",
      "MAT-0015;Sophie Laurent;Responsable Ressources Humaines;LOCAL;2024-06-01;TYPE_A",
      "MAT-0020;Jean-Pierre Dubois;Directeur des Opérations;EXPAT;2025-02-10;TYPE_B",
      "MAT-0025;Marc Lemoine;Superviseur Sécurité Site;EXPAT;2024-09-01;TYPE_A",
      "MAT-0030;Fatima Zahra;Comptable Générale;LOCAL;2023-11-20;TYPE_B"
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `modele_import_employes_rh.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      alert("Aucun employé valide à importer.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedEmployees: Employee[] = validRows.map((r, i) => ({
        id: `emp-${Date.now()}-${i}`,
        idNumber: r.idNumber || `MAT-${String(i + 1).padStart(4, '0')}`,
        name: r.name,
        position: r.position || 'Collaborateur',
        status: r.status,
        hireDate: r.hireDate,
        contractType: r.contractType,
        createdAt: new Date().toISOString(),
      }));

      await onImportEmployees(formattedEmployees);
      onClose();
    } catch (err: any) {
      console.error("Import failed:", err);
      setErrorMsg("Échec de l'import : " + (err.message || "Erreur serveur"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const localCount = parsedRows.filter((r) => r.isValid && r.status === 'LOCAL').length;
  const expatCount = parsedRows.filter((r) => r.isValid && r.status === 'EXPAT').length;

  return (
    <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-4xl w-full p-6 space-y-6 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                Importer la Liste des Employés
              </h3>
              <p className="text-xs text-stone-500">
                Importez vos collaborateurs avec leur Matricule, Poste, Statut (Local / Expatrié) et Contrat depuis Excel / CSV.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-5 overflow-y-auto flex-1 pr-1">

          {/* Template Download & Guide Banner */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
            <div className="flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-950">Besoin du format exact accepté par l'application ?</p>
                <p className="text-amber-800 mt-0.5">
                  Téléchargez notre modèle CSV prêt à l'emploi avec toutes les colonnes requises (Matricule, Nom, Poste, Statut, Date d'embauche, Contrat).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-amber-100 text-amber-950 font-bold px-3.5 py-2 rounded-xl border border-amber-300 shadow-2xs transition-all cursor-pointer shrink-0 active:scale-98"
            >
              <Download className="w-4 h-4 text-amber-700" />
              <span>Télécharger le Modèle</span>
            </button>
          </div>

          {/* Dropzone Upload */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-stone-300 hover:border-stone-500 bg-stone-50/60 hover:bg-stone-50 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.tsv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-white shadow-2xs border border-stone-200 flex items-center justify-center text-stone-700 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-stone-900">
                {file ? file.name : "Cliquez ou glissez-déposez votre fichier Excel / CSV ici"}
              </p>
              <p className="text-xs text-stone-500 mt-0.5">
                Formats acceptés : CSV avec séparateurs virgule (,), point-virgule (;), ou tabulation
              </p>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-sm font-bold text-stone-900">
                    Aperçu de la Liste Détectée ({parsedRows.length} lignes)
                  </h4>
                </div>

                <div className="flex items-center gap-2 text-2xs">
                  <span className="bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-200">
                    {validCount} Valide(s)
                  </span>
                  <span className="bg-teal-50 text-teal-800 font-bold px-2 py-0.5 rounded border border-teal-200">
                    {localCount} Personnel Local
                  </span>
                  <span className="bg-purple-50 text-purple-800 font-bold px-2 py-0.5 rounded border border-purple-200">
                    {expatCount} Expatrié(s)
                  </span>
                </div>
              </div>

              <div className="border border-stone-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-stone-100 text-stone-600 font-bold sticky top-0 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Statut Valid.</th>
                      <th className="py-2.5 px-3">N° Matricule</th>
                      <th className="py-2.5 px-3">Nom & Prénom</th>
                      <th className="py-2.5 px-3">Poste / Fonction</th>
                      <th className="py-2.5 px-3">Statut</th>
                      <th className="py-2.5 px-3">Date Embauche</th>
                      <th className="py-2.5 px-3">Contrat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} className={row.isValid ? 'hover:bg-stone-50' : 'bg-red-50/50'}>
                        <td className="py-2 px-3">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              OK
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-700 font-bold" title={row.validationErrors.join(', ')}>
                              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                              Erreur
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-stone-900">
                          {row.idNumber}
                        </td>
                        <td className="py-2 px-3 font-semibold text-stone-900">
                          {row.name || <span className="text-red-500 italic">Non renseigné</span>}
                        </td>
                        <td className="py-2 px-3 text-stone-600">
                          {row.position}
                        </td>
                        <td className="py-2 px-3">
                          {row.status === 'EXPAT' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                              <Globe className="w-3 h-3 text-purple-600" />
                              EXPAT
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-900 border border-teal-300">
                              <Building2 className="w-3 h-3 text-teal-600" />
                              LOCAL
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono text-stone-700">
                          {row.hireDate}
                        </td>
                        <td className="py-2 px-3">
                          {row.contractType === 'TYPE_A' ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              TYPE_A (6m)
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                              TYPE_B (1an)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
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
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
          >
            Annuler
          </button>

          <button
            type="button"
            disabled={validCount === 0 || isSubmitting || isProcessing}
            onClick={handleConfirmImport}
            className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed active:scale-98"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                <span>Importation dans Cloud SQL...</span>
              </>
            ) : (
              <>
                <BadgeCheck className="w-4 h-4 text-amber-400" />
                <span>Importer {validCount} Employé(s) dans Cloud SQL</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
