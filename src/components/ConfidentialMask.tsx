import React from 'react';
import { Eye, EyeOff, Lock, ShieldAlert } from 'lucide-react';
import { useConfidentiality } from '../context/ConfidentialityContext';

interface ConfidentialMaskProps {
  value: string | number | undefined | null;
  type?: 'salary' | 'phone' | 'id' | 'ss' | 'address' | 'sanction' | 'generic';
  fieldKey: string;
  fieldLabel?: string;
  unit?: string;
  className?: string;
  valueClassName?: string;
  allowReveal?: boolean;
}

export const ConfidentialMask: React.FC<ConfidentialMaskProps> = ({
  value,
  type = 'generic',
  fieldKey,
  fieldLabel,
  unit,
  className = '',
  valueClassName = '',
  allowReveal = true,
}) => {
  const { isConfidentialMode, isFieldRevealed, revealFieldTemporarily, hideField } = useConfidentiality();

  const isRevealed = isFieldRevealed(fieldKey);
  const isMasked = isConfidentialMode && !isRevealed;

  if (value === undefined || value === null || value === '') {
    return <span className={`text-stone-400 font-mono text-xs ${className}`}>Non renseigné</span>;
  }

  const handleToggleReveal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRevealed) {
      hideField(fieldKey);
    } else {
      revealFieldTemporarily(fieldKey, fieldLabel || fieldKey, 15);
    }
  };

  const getMaskedPlaceholder = () => {
    switch (type) {
      case 'salary':
        return '•••••••• FCFA';
      case 'phone':
        const phoneStr = String(value).trim();
        return phoneStr.length > 4 ? `${phoneStr.substring(0, 4)} •• •• ••` : '•• •• •• ••';
      case 'id':
        return '••••••••';
      case 'ss':
        return 'INS-••••••';
      case 'address':
        return '••••••••••••';
      case 'sanction':
        return '•••••••• (Confidentiel RH)';
      default:
        return '••••••••';
    }
  };

  return (
    <div className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
      {isMasked ? (
        <span
          className={`inline-flex items-center gap-1 font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded-lg border border-stone-200 select-none text-xs font-semibold ${valueClassName}`}
          title="Donnée confidentielle masquée (Mode Sécurité RH)"
        >
          <Lock className="w-3 h-3 text-stone-400 shrink-0" />
          <span>{getMaskedPlaceholder()}</span>
        </span>
      ) : (
        <span className={`font-semibold ${valueClassName} ${isRevealed && isConfidentialMode ? 'text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 ring-1 ring-amber-300' : ''}`}>
          {String(value)} {unit ? ` ${unit}` : ''}
        </span>
      )}

      {isConfidentialMode && allowReveal && (
        <button
          type="button"
          onClick={handleToggleReveal}
          className={`p-1 rounded-md transition-all cursor-pointer ${
            isRevealed
              ? 'text-amber-700 hover:text-amber-900 bg-amber-100/70 hover:bg-amber-200'
              : 'text-stone-400 hover:text-stone-700 hover:bg-stone-100'
          }`}
          title={isRevealed ? "Masquer immédiatement" : "Afficher temporairement pendant 15 secondes"}
          aria-label={isRevealed ? "Masquer" : "Afficher la donnée confidentielle"}
        >
          {isRevealed ? <EyeOff className="w-3.5 h-3.5 text-amber-700" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      )}

      {isRevealed && isConfidentialMode && (
        <span className="text-[10px] font-bold text-amber-700 bg-amber-100/90 px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
          <ShieldAlert className="w-2.5 h-2.5" />
          15s
        </span>
      )}
    </div>
  );
};
