import React, { useState } from 'react';
import { Mail, Lock, LogIn, X, AlertCircle, Shield, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const { signInWithEmail, signInWithGoogle, loginAsLocalUser } = useAuth();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await signInWithEmail(username, password);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Une erreur est survenue lors de la connexion.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (userKey: string) => {
    setError(null);
    setIsLoading(true);
    try {
      await loginAsLocalUser(userKey);
      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur de connexion.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur de connexion Google.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
      <div 
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
          <div>
            <h2 className="text-xl font-bold text-stone-900">
              Connexion & Authentification
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Accès à la gestion RH et administration
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full py-2.5 px-4 border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
          >
            <Globe className="w-4 h-4 text-indigo-600" />
            Continuer avec Google
          </button>

          <div className="flex items-center gap-2 my-3">
            <div className="flex-1 border-t border-stone-200" />
            <span className="text-3xs uppercase font-bold text-stone-400">ou compte interne</span>
            <div className="flex-1 border-t border-stone-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 ml-1">Identifiant</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="admin ou user1"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 ml-1">Mot de Passe</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 mt-2 shadow-xs disabled:opacity-70 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Se Connecter
                </>
              )}
            </button>
          </form>

          {/* 1-Click Quick Demo Login */}
          <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-2">
            <h4 className="text-2xs font-bold text-stone-600 uppercase tracking-wider">Connexion Rapide Démo</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                className="text-left px-2.5 py-1.5 bg-white hover:bg-amber-50 border border-stone-200 hover:border-amber-300 rounded-lg text-xs transition-colors cursor-pointer"
              >
                <p className="font-bold text-stone-900 text-2xs">👑 Admin</p>
                <p className="text-3xs text-stone-500">Accès Total</p>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('user1')}
                className="text-left px-2.5 py-1.5 bg-white hover:bg-indigo-50 border border-stone-200 hover:border-indigo-300 rounded-lg text-xs transition-colors cursor-pointer"
              >
                <p className="font-bold text-stone-900 text-2xs">💼 RH Manager</p>
                <p className="text-3xs text-stone-500">Gestion Congés</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
