import React from 'react';
import { AlertTriangle, CheckCircle2, HelpCircle, X, Save, Trash2 } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  type?: 'save' | 'danger' | 'warning' | 'info';
  confirmLabel?: string;
  cancelLabel?: string;
  summaryItems?: { label: string; value: React.ReactNode; icon?: React.ReactNode }[];
  warningMessage?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  subtitle,
  type = 'save',
  confirmLabel = 'Confirmer et Enregistrer',
  cancelLabel = 'Annuler et Continuer la modification',
  summaryItems = [],
  warningMessage,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <Trash2 className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'info':
        return <HelpCircle className="w-5 h-5 text-indigo-600" />;
      case 'save':
      default:
        return <Save className="w-5 h-5 text-emerald-600" />;
    }
  };

  const getHeaderBg = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-50 text-red-900 border-red-200';
      case 'warning':
        return 'bg-amber-50 text-amber-900 border-amber-200';
      case 'info':
        return 'bg-indigo-50 text-indigo-900 border-indigo-200';
      case 'save':
      default:
        return 'bg-emerald-50 text-emerald-950 border-emerald-200';
    }
  };

  const getConfirmBtnStyle = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 text-white';
      case 'info':
        return 'bg-indigo-600 hover:bg-indigo-700 text-white';
      case 'save':
      default:
        return 'bg-stone-900 hover:bg-stone-800 text-white';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-stone-200 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-5 border-b flex items-start justify-between gap-3 ${getHeaderBg()}`}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white shadow-2xs flex items-center justify-center shrink-0 mt-0.5 border border-stone-200/60">
              {getIcon()}
            </div>
            <div>
              <h3 className="text-base font-bold leading-snug">{title}</h3>
              {subtitle && <p className="text-xs opacity-80 mt-0.5 leading-relaxed">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-white/60 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Summary of Changes */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {summaryItems && summaryItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-2xs font-bold text-stone-400 uppercase tracking-wider">
                Récapitulatif des informations à enregistrer :
              </p>
              <div className="bg-stone-50 border border-stone-200/80 rounded-2xl divide-y divide-stone-100 overflow-hidden text-xs">
                {summaryItems.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between gap-3">
                    <span className="text-stone-500 font-medium flex items-center gap-1.5 shrink-0">
                      {item.icon}
                      {item.label}
                    </span>
                    <span className="font-bold text-stone-900 text-right">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {warningMessage && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{warningMessage}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-stone-50/80 border-t border-stone-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98 disabled:opacity-50 ${getConfirmBtnStyle()}`}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{confirmLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
