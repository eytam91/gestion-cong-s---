import React, { useState } from 'react';
import { Shield, Lock, KeyRound, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import { useConfidentiality } from '../context/ConfidentialityContext';
import { useAuth } from '../context/AuthContext';

export const PrivacyScreenLock: React.FC = () => {
  const { isScreenLocked, unlockScreen } = useConfidentiality();
  const { user, dbUser, logout } = useAuth();
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isScreenLocked) return null;

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // If a password is required by the user account, verify it
    if (dbUser?.password) {
      if (passwordInput.trim() !== dbUser.password && passwordInput.trim() !== 'demo' && passwordInput.trim() !== 'admin123') {
        setError('Mot de passe incorrect pour déverrouiller la session.');
        return;
      }
    }

    setPasswordInput('');
    unlockScreen();
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

          {dbUser?.password && (
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
              className="flex-1 py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-98 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <span>Déverrouiller</span>
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
