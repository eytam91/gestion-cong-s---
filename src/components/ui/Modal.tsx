import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  /** Tailwind max-width class for the panel. */
  maxWidth?: string;
  children: React.ReactNode;
}

/** Overlay + panel shell shared by every dialog in the app. */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  maxWidth = 'max-w-xl',
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`bg-white rounded-3xl border border-stone-200 shadow-2xl ${maxWidth} w-full p-6 space-y-5 max-h-[92vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between border-b border-stone-100 pb-3 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && (
              <div className="w-10 h-10 rounded-2xl bg-stone-900 text-white flex items-center justify-center shadow-xs shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-stone-900 truncate">{title}</h3>
              {subtitle && <p className="text-2xs text-stone-500">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
            title="Fermer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
};
