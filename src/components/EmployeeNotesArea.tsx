import React, { useState, useEffect } from 'react';
import {
  FileText,
  Save,
  CheckCircle2,
  Clock,
  Trash2,
  Edit3,
  Sparkles,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { Employee } from '../types';

interface EmployeeNotesAreaProps {
  employee: Employee;
  onUpdateEmployee: (updatedEmployee: Employee) => void;
  className?: string;
}

export const EmployeeNotesArea: React.FC<EmployeeNotesAreaProps> = ({
  employee,
  onUpdateEmployee,
  className = ''
}) => {
  const [notesText, setNotesText] = useState(employee.notes || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);

  // Sync when employee prop updates
  useEffect(() => {
    setNotesText(employee.notes || '');
  }, [employee.notes, employee.id]);

  const hasUnsavedChanges = (employee.notes || '') !== notesText;

  const handleSave = () => {
    setIsSaving(true);
    const updated: Employee = {
      ...employee,
      notes: notesText.trim() ? notesText.trim() : undefined
    };

    onUpdateEmployee(updated);

    setTimeout(() => {
      setIsSaving(false);
      setIsEditing(false);
      setShowSavedFeedback(true);
      setTimeout(() => setShowSavedFeedback(false), 3000);
    }, 200);
  };

  const handleCancel = () => {
    setNotesText(employee.notes || '');
    setIsEditing(false);
  };

  const handleInsertTimestamp = () => {
    const now = new Date();
    const formatted = now.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const time = now.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const stamp = `[${formatted} à ${time} - Note RH] : `;
    
    setNotesText((prev) => (prev ? `${prev}\n\n${stamp}` : stamp));
    setIsEditing(true);
  };

  const handleInsertSnippet = (snippet: string) => {
    const now = new Date().toLocaleDateString('fr-FR');
    const fullSnippet = `[${now}] ${snippet}`;
    setNotesText((prev) => (prev ? `${prev}\n${fullSnippet}` : fullSnippet));
    setIsEditing(true);
  };

  const handleClearNotes = () => {
    if (window.confirm('Voulez-vous vraiment effacer l\'intégralité des notes de ce dossier employé ?')) {
      setNotesText('');
      const updated: Employee = {
        ...employee,
        notes: undefined
      };
      onUpdateEmployee(updated);
      setIsEditing(false);
      setShowSavedFeedback(true);
      setTimeout(() => setShowSavedFeedback(false), 2000);
    }
  };

  return (
    <div className={`bg-white rounded-3xl border border-stone-200/90 shadow-xs overflow-hidden transition-all ${className}`}>
      {/* Header bar */}
      <div className="p-4 sm:p-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-amber-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-stone-900">
                Zone de Notes & Remarques RH
              </h3>
              {hasUnsavedChanges && (
                <span className="text-3xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                  Modifications non enregistrées
                </span>
              )}
              {showSavedFeedback && (
                <span className="inline-flex items-center gap-1 text-3xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Note enregistrée
                </span>
              )}
            </div>
            <p className="text-2xs text-stone-500">
              Observations internes, journal des erreurs corrigées et consignes administratives.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-stone-800 bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-stone-600" />
              <span>{notesText ? 'Modifier les notes' : 'Rédiger une note'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCancel}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 transition-all shadow-2xs cursor-pointer active:scale-98"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Enregistrement...' : 'Enregistrer'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-5 space-y-3">
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              rows={6}
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Saisissez vos observations, remarques ou historiques de corrections..."
              className="w-full p-3.5 text-xs rounded-2xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 leading-relaxed font-sans text-stone-900 resize-y min-h-[140px]"
              autoFocus
            />

            {/* Quick Insertion Helpers */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-2xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-stone-400 font-semibold">Raccourcis :</span>
                <button
                  type="button"
                  onClick={handleInsertTimestamp}
                  className="px-2 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium cursor-pointer transition-colors"
                >
                  + Horodatage
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertSnippet('Correction d\'erreur d\'état civil validée.')}
                  className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-medium cursor-pointer transition-colors"
                >
                  + Correction validée
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertSnippet('Régularisation INSESO en cours auprès de la caisse.')}
                  className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-medium cursor-pointer transition-colors"
                >
                  + Suivi INSESO
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertSnippet('Relance envoyée au collaborateur pour pièce manquante.')}
                  className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-medium cursor-pointer transition-colors"
                >
                  + Relance pièce
                </button>
              </div>

              {notesText && (
                <button
                  type="button"
                  onClick={handleClearNotes}
                  className="text-stone-400 hover:text-red-600 transition-colors p-1"
                  title="Effacer l'intégralité du texte"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div>
            {notesText ? (
              <div
                onClick={() => setIsEditing(true)}
                className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/60 hover:border-amber-300 text-xs text-stone-800 whitespace-pre-wrap leading-relaxed cursor-pointer transition-colors group"
                title="Cliquez pour éditer cette note"
              >
                {notesText}
                <div className="mt-3 pt-2 border-t border-amber-200/50 flex items-center justify-between text-3xs text-stone-400">
                  <span className="flex items-center gap-1 group-hover:text-amber-800 transition-colors">
                    <Edit3 className="w-3 h-3" />
                    Cliquer pour modifier
                  </span>
                  <span className="font-mono">{notesText.length} caractères</span>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setIsEditing(true)}
                className="p-6 rounded-2xl bg-stone-50 border border-dashed border-stone-200 hover:border-stone-400 text-center cursor-pointer transition-colors group"
              >
                <FileText className="w-6 h-6 text-stone-300 mx-auto mb-1.5 group-hover:text-amber-500 transition-colors" />
                <p className="text-xs font-bold text-stone-700">Aucune note ou observation consignée</p>
                <p className="text-2xs text-stone-400 mt-0.5">
                  Cliquez ici pour consigner des remarques RH, un suivi d'erreur ou des annotations de gestion.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Security & Confidentiality Reminder Banner */}
        <div className="px-3.5 py-2 rounded-xl bg-stone-100/80 border border-stone-200/70 text-3xs text-stone-500 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            Confidentiel RH • Journalisation automatique de toutes les modifications
          </span>
          <span className="font-mono text-stone-400 hidden sm:inline">Chiffrement en transit & au repos</span>
        </div>
      </div>
    </div>
  );
};
