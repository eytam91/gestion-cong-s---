import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Clock, 
  RefreshCw, 
  LogOut, 
  Lock, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  Mail,
  User as UserIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface GateProps {
  type?: 'pending' | 'unauthorized';
  message?: string;
  onRetry?: () => void;
}

export const Gate: React.FC<GateProps> = ({ 
  type = 'pending', 
  message,
  onRetry 
}) => {
  const { user, dbUser, logout, reloadUserProfile } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [checkNotice, setCheckNotice] = useState<string | null>(null);

  const handleCheckApproval = async () => {
    setIsChecking(true);
    setCheckNotice(null);
    try {
      await reloadUserProfile();
      if (onRetry) onRetry();
      setCheckNotice("Profil actualisé.");
    } catch {
      setCheckNotice("Vérification terminée. Statut inchangé.");
    } finally {
      setIsChecking(false);
      setTimeout(() => setCheckNotice(null), 3000);
    }
  };

  const displayName = dbUser?.name || user?.displayName || user?.email || 'Collaborateur';
  const displayEmail = dbUser?.email || user?.email || 'Email non renseigné';

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xl max-w-lg w-full p-6 sm:p-8 space-y-6 text-center animate-in fade-in duration-200">
        
        {/* Icon & Header */}
        <div className="space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto border border-amber-200/80 shadow-xs">
            {type === 'pending' ? (
              <Clock className="w-8 h-8 text-amber-600 animate-pulse" />
            ) : (
              <ShieldAlert className="w-8 h-8 text-rose-600" />
            )}
          </div>
          
          <div>
            <h1 className="text-xl font-bold text-stone-900">
              {type === 'pending' ? 'Compte en attente d’approbation' : 'Accès Restreint'}
            </h1>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto leading-relaxed">
              {message || (type === 'pending' 
                ? "Votre inscription a bien été enregistrée. Pour des raisons de confidentialité RH, un Administrateur doit valider votre profil avant tout accès aux données."
                : "Vous ne possédez pas les autorisations nécessaires pour accéder à cette section.")}
            </p>
          </div>
        </div>

        {/* User Card */}
        <div className="bg-stone-50 rounded-2xl border border-stone-200/70 p-4 text-left space-y-2.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-900 text-white font-bold text-sm flex items-center justify-center shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-xs text-stone-900 truncate">{displayName}</p>
              <p className="text-2xs text-stone-500 truncate flex items-center gap-1 font-mono">
                <Mail className="w-3 h-3 text-stone-400" />
                {displayEmail}
              </p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-3xs font-bold uppercase tracking-wider shrink-0 ${
              type === 'pending'
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-rose-100 text-rose-900 border border-rose-300'
            }`}>
              {type === 'pending' ? 'Statut : EN ATTENTE' : 'Accès Refusé'}
            </span>
          </div>

          <div className="pt-2 border-t border-stone-200/50 flex items-center justify-between text-2xs text-stone-500">
            <span>Rôle attribué :</span>
            <span className="font-mono font-bold text-stone-700">{dbUser?.role || 'PENDING'}</span>
          </div>
        </div>

        {checkNotice && (
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-1.5 border border-emerald-200 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{checkNotice}</span>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2 pt-2">
          {type === 'pending' && (
            <button
              onClick={handleCheckApproval}
              disabled={isChecking}
              className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 active:scale-98"
            >
              <RefreshCw className={`w-4 h-4 text-amber-400 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Vérification en cours...' : 'Vérifier mon approbation'}</span>
            </button>
          )}

          <button
            onClick={() => logout()}
            className="w-full py-2.5 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 hover:text-stone-900 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4 text-stone-400" />
            <span>Se déconnecter</span>
          </button>
        </div>

        {/* Footer info */}
        <p className="text-3xs text-stone-400">
          Système de Gestion des Congés & Statuts RH • Sécurité Cloud Firestore & Rôles
        </p>
      </div>
    </div>
  );
};
