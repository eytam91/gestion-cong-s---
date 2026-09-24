import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { addActivityLog } from '../utils/auditLogger';

interface ConfidentialityContextType {
  isConfidentialMode: boolean;
  setConfidentialMode: (active: boolean) => void;
  toggleConfidentialMode: () => void;
  revealedFields: Record<string, number>; // fieldKey -> expiration timestamp
  revealFieldTemporarily: (fieldKey: string, fieldLabel?: string, seconds?: number) => void;
  hideField: (fieldKey: string) => void;
  isFieldRevealed: (fieldKey: string) => boolean;
  maskText: (text: string | number | undefined | null, type?: 'salary' | 'phone' | 'id' | 'ss' | 'address' | 'sanction' | 'generic', fieldKey?: string) => string;
  isScreenLocked: boolean;
  lockScreenNow: () => void;
  unlockScreen: () => void;
  autoLockMinutes: number;
  setAutoLockMinutes: (min: number) => void;
}

const ConfidentialityContext = createContext<ConfidentialityContextType>({
  isConfidentialMode: true,
  setConfidentialMode: () => {},
  toggleConfidentialMode: () => {},
  revealedFields: {},
  revealFieldTemporarily: () => {},
  hideField: () => {},
  isFieldRevealed: () => false,
  maskText: () => '••••••••',
  isScreenLocked: false,
  lockScreenNow: () => {},
  unlockScreen: () => {},
  autoLockMinutes: 5,
  setAutoLockMinutes: () => {},
});

const CONFIDENTIAL_MODE_STORAGE_KEY = 'rh_confidential_mode_active';
const AUTO_LOCK_STORAGE_KEY = 'rh_auto_lock_minutes';

export const ConfidentialityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Confidentiality is enabled by default to ensure privacy by design
  const [isConfidentialMode, setIsConfidentialMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(CONFIDENTIAL_MODE_STORAGE_KEY);
    return saved !== null ? saved === 'true' : true;
  });

  const [autoLockMinutes, setAutoLockMinutesState] = useState<number>(() => {
    const saved = localStorage.getItem(AUTO_LOCK_STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 5;
  });

  const [isScreenLocked, setIsScreenLocked] = useState<boolean>(false);
  const [revealedFields, setRevealedFields] = useState<Record<string, number>>({});
  const lastActivityRef = useRef<number>(Date.now());

  // Save confidentiality preference
  const setConfidentialMode = useCallback((active: boolean) => {
    setIsConfidentialMode(active);
    localStorage.setItem(CONFIDENTIAL_MODE_STORAGE_KEY, String(active));
    addActivityLog({
      action: 'CONFIDENTIAL_MODE_TOGGLED',
      actionLabel: active ? 'Mode Confidentialité Activé' : 'Mode Confidentialité Désactivé',
      details: active 
        ? 'Protection des données sensibles (Salaires, Pièces d\'identité, Téléphones, INSESO) activée.'
        : 'Affichage des données sensibles en clair désactivé pour la session.',
    });
  }, []);

  const toggleConfidentialMode = useCallback(() => {
    setConfidentialMode(!isConfidentialMode);
  }, [isConfidentialMode, setConfidentialMode]);

  const setAutoLockMinutes = useCallback((min: number) => {
    setAutoLockMinutesState(min);
    localStorage.setItem(AUTO_LOCK_STORAGE_KEY, String(min));
  }, []);

  // Temporarily reveal a specific sensitive field for N seconds
  const revealFieldTemporarily = useCallback((fieldKey: string, fieldLabel?: string, seconds: number = 15) => {
    const expiresAt = Date.now() + seconds * 1000;
    setRevealedFields((prev) => ({ ...prev, [fieldKey]: expiresAt }));

    addActivityLog({
      action: 'CONFIDENTIAL_DATA_REVEALED',
      actionLabel: 'Donnée Sensible Démasquée',
      details: `Affichage temporaire (${seconds}s) du champ sensible : ${fieldLabel || fieldKey}`,
      targetId: fieldKey,
    });
  }, []);

  const hideField = useCallback((fieldKey: string) => {
    setRevealedFields((prev) => {
      const copy = { ...prev };
      delete copy[fieldKey];
      return copy;
    });
  }, []);

  const isFieldRevealed = useCallback((fieldKey: string): boolean => {
    if (!isConfidentialMode) return true;
    const expiresAt = revealedFields[fieldKey];
    if (!expiresAt) return false;
    return Date.now() < expiresAt;
  }, [isConfidentialMode, revealedFields]);

  // Clean up expired revealed fields periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setRevealedFields((prev) => {
        let changed = false;
        const next: Record<string, number> = {};
        for (const [k, exp] of Object.entries(prev) as [string, number][]) {
          if (exp > now) {
            next[k] = exp;
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Auto-Lock due to inactivity
  const lockScreenNow = useCallback(() => {
    setIsScreenLocked(true);
    addActivityLog({
      action: 'CONFIDENTIAL_MODE_TOGGLED',
      actionLabel: 'Verrouillage de Session RH',
      details: 'Écran de travail verrouillé pour préserver la confidentialité des collaborateurs.',
    });
  }, []);

  const unlockScreen = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIsScreenLocked(false);
  }, []);

  useEffect(() => {
    if (autoLockMinutes <= 0) return;

    const onUserActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', onUserActivity, { passive: true });
    window.addEventListener('keydown', onUserActivity, { passive: true });
    window.addEventListener('touchstart', onUserActivity, { passive: true });
    window.addEventListener('click', onUserActivity, { passive: true });

    const checkInactivity = setInterval(() => {
      if (isScreenLocked) return;
      const inactiveDurationMs = Date.now() - lastActivityRef.current;
      if (inactiveDurationMs >= autoLockMinutes * 60 * 1000) {
        setIsScreenLocked(true);
        addActivityLog({
          action: 'CONFIDENTIAL_MODE_TOGGLED',
          actionLabel: 'Verrouillage Automatique d\'Inactivité',
          details: `Inactivité prolongée (${autoLockMinutes} min) : Session RH sécurisée automatiquement.`,
        });
      }
    }, 15000);

    return () => {
      window.removeEventListener('mousemove', onUserActivity);
      window.removeEventListener('keydown', onUserActivity);
      window.removeEventListener('touchstart', onUserActivity);
      window.removeEventListener('click', onUserActivity);
      clearInterval(checkInactivity);
    };
  }, [autoLockMinutes, isScreenLocked]);

  // Formatting & Masking Helper
  const maskText = useCallback((
    text: string | number | undefined | null,
    type: 'salary' | 'phone' | 'id' | 'ss' | 'address' | 'sanction' | 'generic' = 'generic',
    fieldKey?: string
  ): string => {
    if (text === undefined || text === null || text === '') {
      return '—';
    }

    if (fieldKey && isFieldRevealed(fieldKey)) {
      return String(text);
    }

    if (!isConfidentialMode) {
      return String(text);
    }

    const str = String(text).trim();

    switch (type) {
      case 'salary':
        return '•••••••• FCFA';
      case 'phone':
        if (str.length > 4) {
          return str.substring(0, 4) + ' •• •• ••';
        }
        return '•• •• •• ••';
      case 'id':
        if (str.length > 3) {
          return str.substring(0, 2) + '••••••••';
        }
        return '••••••••';
      case 'ss':
        return 'INS-••••••';
      case 'address':
        return '•••••••• (Confidentiel)';
      case 'sanction':
        return '•••••••• (Confidentiel RH)';
      case 'generic':
      default:
        return '••••••••';
    }
  }, [isConfidentialMode, isFieldRevealed]);

  return (
    <ConfidentialityContext.Provider
      value={{
        isConfidentialMode,
        setConfidentialMode,
        toggleConfidentialMode,
        revealedFields,
        revealFieldTemporarily,
        hideField,
        isFieldRevealed,
        maskText,
        isScreenLocked,
        lockScreenNow,
        unlockScreen,
        autoLockMinutes,
        setAutoLockMinutes,
      }}
    >
      {children}
    </ConfidentialityContext.Provider>
  );
};

export const useConfidentiality = () => useContext(ConfidentialityContext);
