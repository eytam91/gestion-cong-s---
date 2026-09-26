import React, { useState } from 'react';
import { Shield, Lock, KeyRound, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
} from 'firebase/auth';
import { useConfidentiality } from '../context/ConfidentialityContext';
import { useAuth } from '../context/AuthContext';
import { auth, googleAuthProvider } from '../lib/firebase';

export const PrivacyScreenLock: React.FC = () => {
  const { isScreenLocked, unlockScreen } = useConfidentiality();
  const { user, dbUser, logout } = useAuth();
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  // Google-only accounts have no password to type; they re-verify via the popup.
  const usesPassword = (auth.currentUser?.providerData ?? []).some(
    (p) => p.providerId === 'password',
  );

  if (!isScreenLocked) return null;

  /**
   * Unlocking re-authenticates against Firebase rather than comparing a password
   * held in the profile document: the client never sees the real credential, so
   * there is nothing here to read out of memory or out of Firestore.
   */
  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const current = auth.currentUser;
    if (!current) {
      // No session left to unlock into — send them back to the login screen.
      unlockScreen();
      await logout();
      return;
    }

    const password = passwordInput.trim();
    if (usesPassword && !password) {
      setError('Saisissez votre mot de passe pour reprendre la session.');
      return;
    }

    setChecking(true);
    try {
      if (usesPassword) {
        const email = current.email;
        if (!email) throw new Error('no-email');
        await reauthenticateWithCredential(
          current,
          EmailAuthProvider.credential(email, password),
        );
      } else {
        // Google accounts have no password here, so the provider re-verifies them.
        await reauthenticateWithPopup(current, googleAuthProvider);
      }
      setPasswordInput('');
      unlockScreen();
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/too-many-requests') {
        setError('Trop de tentatives. Patientez quelques minutes avant de réessayer.');
      } else if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setError('Vérification annulée : la fenêtre Google a été fermée.');
      } else {
        setError(
          usesPassword
            ? 'Mot de passe incorrect pour déverrouiller la session.'
            : 'Vérification Google échouée. Réessayez.',
        );
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-stone-200 overflow-hidden text-center p-8 space-y-6">
        {/* Shield Icon */}
        <div className="mx-auto w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-200 shadow-inner">
          <Lock className="w-8 h-8 text-amber-600 animate-pulse" />
        </div>

        {/* Title and Explanation */}
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-2xs font-bold bg-amber-100 text-amber-900 border border-amber-300 font-mono uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5 text-amber-700" />
            Confidentialité & Sécurité RH
          </span>
          <h2 className="text-xl font-bold text-stone-900">
            Session RH Verrouillée
          </h2>
          <p className="text-xs text-stone-500 leading-relaxed max-w-sm mx-auto">
            L'affichage a été suspendu pour protéger les données confidentielles des collaborateurs (salaires, pièces d'identité, coordonnées personnelles).
          </p>
        </div>

        {/* Current Active User Profile */}
        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 text-left flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center font-bold text-sm">
              {dbUser?.name ? dbUser.name[0].toUpperCase() : 'U'}
            </div>
            <div>
              <p className="text-xs font-bold text-stone-900">{dbUser?.name || user?.displayName || 'Session Active'}</p>
              <p className="text-2xs text-stone-500">{dbUser?.email || user?.email || 'Utilisateur RH'}</p>
            </div>
          </div>
          <span className="text-2xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
            {dbUser?.role || 'Utilisateur'}
          </span>
        </div>

        {/* Unlock Form */}
        <form onSubmit={handleUnlockSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-2xs text-red-700 font-medium text-left">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {usesPassword ? (
          <div className="text-left space-y-1">
            <label className="block text-2xs font-bold text-stone-600 ml-1">
              Mot de passe de session
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
              <input
                type="password"
                autoFocus
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Saisissez votre mot de passe pour reprendre..."
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium placeholder:text-stone-400"
              />
            </div>
          </div>
          ) : (
            <p className="text-2xs text-stone-500 text-left leading-relaxed">
              Votre compte utilise la connexion Google : cliquez sur « Déverrouiller »
              pour confirmer votre identité auprès de Google.
            </p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                unlockScreen();
                logout();
              }}
              className="flex-1 py-2.5 px-3 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Changer d'utilisateur</span>
            </button>

            <button
              type="submit"
              disabled={checking}
              className="flex-1 py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-98 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <span>{checking ? 'Vérification...' : 'Déverrouiller'}</span>
            </button>
          </div>
        </form>

        <p className="text-[11px] text-stone-400 font-mono">
          Protection Conforme RGPD & Confidentialité des Dossiers du Personnel
        </p>
      </div>
    </div>
  );
};
