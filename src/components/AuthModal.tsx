import React, { useState } from 'react';
import { Mail, Lock, LogIn, X, AlertCircle, Shield, Globe, UserPlus, UserCheck, KeyRound, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const { signInWithEmail, signInWithGoogle, loginAsLocalUser, registerNewAccount } = useAuth();
  
  const [activeMode, setActiveMode] = useState<'login' | 'register'>('login');
  
  // Login form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Register form
  const [regUsername, setRegUsername] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'ADMIN' | 'HR Manager'>('ADMIN');

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
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

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      await registerNewAccount(regUsername, regFullName, regRole, regPassword);
      setSuccessMsg('Compte créé et connecté avec succès !');
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur lors de la création du compte.");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div 
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/70">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-stone-900">
                Espace Connexion RH & Admin
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Accédez à la gestion centralisée des congés
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-stone-200 bg-stone-100/50">
          <button
            type="button"
            onClick={() => { setActiveMode('login'); setError(null); }}
            className={`flex-1 py-2.5 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeMode === 'login'
                ? 'bg-white text-stone-900 border-b-2 border-indigo-600'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Se Connecter
          </button>
          <button
            type="button"
            onClick={() => { setActiveMode('register'); setError(null); }}
            className={`flex-1 py-2.5 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeMode === 'register'
                ? 'bg-white text-stone-900 border-b-2 border-indigo-600'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Nouveau Compte
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2 text-emerald-800 text-xs font-medium">
              <UserCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <p>{successMsg}</p>
            </div>
          )}

          {/* 1-Click Quick Demo Login Box */}
          <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200/80 space-y-2">
            <div className="flex items-center gap-1.5 text-amber-900">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <h4 className="text-2xs font-bold uppercase tracking-wider">Connexion Rapide Démo (1 Clic)</h4>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                className="text-left p-2 bg-white hover:bg-amber-100/60 border border-amber-300 rounded-xl text-xs transition-colors cursor-pointer shadow-2xs group"
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold text-stone-900 text-2xs group-hover:text-amber-900">👑 Administrateur</p>
                  <span className="text-[10px] bg-amber-200/80 text-amber-900 px-1.5 py-0.2 rounded font-mono font-bold">ADMIN</span>
                </div>
                <p className="text-[10px] text-stone-500 mt-0.5">Accès & modification totale</p>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('user1')}
                className="text-left p-2 bg-white hover:bg-indigo-50 border border-stone-300 hover:border-indigo-300 rounded-xl text-xs transition-colors cursor-pointer shadow-2xs group"
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold text-stone-900 text-2xs group-hover:text-indigo-900">💼 Gestionnaire RH</p>
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded font-mono font-bold">RH</span>
                </div>
                <p className="text-[10px] text-stone-500 mt-0.5">Gestion des congés</p>
              </button>
            </div>
          </div>

          {activeMode === 'login' ? (
            <>
              {/* Google Sign In */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full py-2.5 px-4 border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <Globe className="w-4 h-4 text-indigo-600" />
                Continuer avec Compte Google
              </button>

              <div className="flex items-center gap-2 my-2">
                <div className="flex-1 border-t border-stone-200" />
                <span className="text-3xs uppercase font-bold text-stone-400">ou avec identifiant</span>
                <div className="flex-1 border-t border-stone-200" />
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-stone-700 ml-1">Identifiant ou Email</label>
                    <span className="text-[10px] text-stone-400 font-mono">ex: admin ou user1</span>
                  </div>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="admin, user1 ou votre email"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-stone-700 ml-1">Mot de Passe</label>
                    <span className="text-[10px] text-stone-400 font-mono">admin123 / user123</span>
                  </div>
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
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 mt-2 shadow-xs disabled:opacity-70 cursor-pointer active:scale-98"
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
            </>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 ml-1">Nom et Prénom</label>
                <input
                  type="text"
                  required
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Sophie Martin"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 ml-1">Identifiant / Pseudo</label>
                <input
                  type="text"
                  required
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: smartin ou sophie"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 ml-1">Rôle</label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as 'ADMIN' | 'HR Manager')}
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  <option value="ADMIN">ADMIN (Administrateur Total)</option>
                  <option value="HR Manager">HR Manager (Gestionnaire RH)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 ml-1">Mot de passe</label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 mt-3 shadow-xs disabled:opacity-70 cursor-pointer active:scale-98"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Créer & Se Connecter
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
