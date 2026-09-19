import React, { useState } from 'react';
import { Lock, LogIn, X, AlertCircle, Shield, User, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  onClose: () => void;
}

type Mode = 'login' | 'register';

export const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const { signInWithEmail, registerNewAccount, signInWithGoogle } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isRegister = mode === 'register';
  const canSubmit =
    username.trim().length >= 3 &&
    password.length >= 6 &&
    (!isRegister || fullName.trim().length >= 2);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isRegister) {
        await registerNewAccount(username, fullName, password);
      } else {
        await signInWithEmail(username, password);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    'w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium placeholder:text-stone-400';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-stone-200">
        <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 id="auth-modal-title" className="text-base font-bold text-stone-900">
                {isRegister ? 'Créer un compte' : 'Espace Connexion RH & Admin'}
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                {isRegister
                  ? 'Votre accès devra être validé par un administrateur'
                  : 'Veuillez saisir votre identifiant et mot de passe'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div
              role="alert"
              className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-700 text-xs font-medium"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <p className="leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label
                  htmlFor="auth-fullname"
                  className="block text-xs font-bold text-stone-700 mb-1.5 ml-1"
                >
                  Nom complet
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    id="auth-fullname"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={inputClass}
                    placeholder="Ex: Jean Dupont"
                  />
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="auth-username"
                className="block text-xs font-bold text-stone-700 mb-1.5 ml-1"
              >
                Identifiant
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  id="auth-username"
                  type="text"
                  required
                  autoFocus={!isRegister}
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={inputClass}
                  placeholder="Votre identifiant ou adresse e-mail"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="block text-xs font-bold text-stone-700 mb-1.5 ml-1"
              >
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  id="auth-password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder="••••••••"
                />
              </div>
              {isRegister && (
                <p className="text-[11px] text-stone-500 mt-1 ml-1">Minimum 6 caractères.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !canSubmit}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-stone-200 disabled:text-stone-400 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 mt-2 shadow-xs cursor-pointer disabled:cursor-not-allowed active:scale-98"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isRegister ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                  <span>{isRegister ? 'Créer mon compte' : 'Se Connecter'}</span>
                </>
              )}
            </button>
          </form>

          <div className="flex items-center gap-3">
            <div className="h-px bg-stone-200 flex-1" />
            <span className="text-[11px] text-stone-400 font-medium">ou</span>
            <div className="h-px bg-stone-200 flex-1" />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={isLoading}
            className="w-full py-2.5 border border-stone-200 hover:bg-stone-50 text-stone-700 font-bold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
          >
            Continuer avec Google
          </button>

          <p className="text-xs text-stone-500 text-center pt-1">
            {isRegister ? 'Vous avez déjà un compte ?' : 'Pas encore de compte ?'}{' '}
            <button
              type="button"
              onClick={() => switchMode(isRegister ? 'login' : 'register')}
              className="font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              {isRegister ? 'Se connecter' : 'Créer un compte'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
