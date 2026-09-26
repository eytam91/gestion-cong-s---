import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  Trash2,
  Search,
  RefreshCw,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  DbUser,
  UserRole,
  fetchUsers,
  setUserRole,
  deleteUserDoc,
} from '../services/firestoreService';
import { ConfirmModal } from './ConfirmModal';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'PENDING', label: 'En attente (aucun accès)' },
  { value: 'HR Manager', label: 'HR Manager (Gestionnaire RH)' },
  { value: 'ADMIN', label: 'ADMIN (Administrateur Total)' },
];

const ROLE_BADGE: Record<UserRole, string> = {
  ADMIN: 'bg-amber-100 text-amber-900 border border-amber-200',
  'HR Manager': 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  PENDING: 'bg-stone-100 text-stone-600 border border-stone-200',
};

export const UserManager: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState<DbUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [savingUid, setSavingUid] = useState<string | null>(null);

  const [userToDelete, setUserToDelete] = useState<DbUser | null>(null);
  const [roleChange, setRoleChange] = useState<{ target: DbUser; role: UserRole } | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await fetchUsers());
    } catch (err) {
      console.error('Failed to load users:', err);
      setError("Impossible de charger la liste des comptes. Vérifiez vos droits d'administrateur.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleExecuteRoleChange = async () => {
    if (!roleChange) return;
    const { target, role } = roleChange;
    setRoleChange(null);
    setSavingUid(target.uid);
    setError(null);
    try {
      await setUserRole(target.uid, role);
      setUsers((prev) => prev.map((u) => (u.uid === target.uid ? { ...u, role } : u)));
    } catch (err) {
      console.error('Failed to update role:', err);
      setError(`Impossible de modifier le rôle de ${target.name}.`);
    } finally {
      setSavingUid(null);
    }
  };

  const handleExecuteDelete = async () => {
    if (!userToDelete) return;
    const uid = userToDelete.uid;
    setUserToDelete(null);
    setError(null);
    try {
      await deleteUserDoc(uid);
      setUsers((prev) => prev.filter((u) => u.uid !== uid));
    } catch (err) {
      console.error('Failed to delete user:', err);
      setError("Impossible de supprimer ce compte.");
    }
  };

  const filteredUsers = users.filter((u) =>
    (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.role || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingCount = users.filter((u) => u.role === 'PENDING').length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-stone-900">Gestion des Utilisateurs & Rôles</h2>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Les comptes sont créés par les utilisateurs eux-mêmes via l'écran de connexion.
            Ils arrivent « En attente » et n'ont accès à rien tant qu'un administrateur ne
            leur accorde pas un rôle ici.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadUsers}
            title="Rafraîchir"
            className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
          <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>{pendingCount}</strong> compte(s) en attente de validation. Attribuez-leur
            un rôle pour leur ouvrir l'accès, ou supprimez-les.
          </span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-100 flex items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Rechercher un utilisateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <span className="text-xs text-stone-500 font-mono">
            {filteredUsers.length} utilisateur(s)
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-stone-500 text-xs">Chargement des utilisateurs...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-stone-500 text-xs">Aucun utilisateur trouvé.</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredUsers.map((u) => {
              const isSelf = u.uid === user?.uid;
              return (
                <div key={u.uid} className="p-4 hover:bg-stone-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-700 font-bold uppercase text-sm border border-stone-200 shrink-0">
                      {u.name?.charAt(0) || u.email?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                        {u.name}
                        {isSelf && (
                          <span className="text-3xs font-mono font-semibold text-stone-400 uppercase">
                            (vous)
                          </span>
                        )}
                      </h3>
                      <span className="text-xs text-stone-500 font-mono">{u.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {isAdmin && !isSelf ? (
                      <select
                        value={u.role}
                        disabled={savingUid === u.uid}
                        onChange={(e) =>
                          setRoleChange({ target: u, role: e.target.value as UserRole })
                        }
                        className="text-xs px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 cursor-pointer"
                      >
                        {ROLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={`text-xs px-2.5 py-1 rounded-md font-bold ${ROLE_BADGE[u.role] || ROLE_BADGE.PENDING}`}>
                        {u.role}
                      </span>
                    )}

                    {isAdmin && !isSelf && (
                      <button
                        onClick={() => setUserToDelete(u)}
                        title="Supprimer"
                        className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!isAdmin && (
        <p className="text-2xs text-stone-500 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-stone-400" />
          Seul un administrateur peut modifier les rôles ou supprimer un compte.
        </p>
      )}

      {/* Role Change Confirm Modal */}
      {roleChange && (
        <ConfirmModal
          isOpen
          title={`Modifier le rôle de ${roleChange.target.name} ?`}
          subtitle="Le nouveau rôle prend effet immédiatement, y compris côté base de données."
          type={roleChange.role === 'ADMIN' ? 'warning' : 'save'}
          confirmLabel="Confirmer le rôle"
          cancelLabel="Annuler"
          warningMessage={
            roleChange.role === 'ADMIN'
              ? "Un administrateur peut lire et modifier l'intégralité des dossiers du personnel, et gérer les autres comptes."
              : undefined
          }
          summaryItems={[
            { label: 'Utilisateur', value: roleChange.target.name },
            { label: 'Rôle actuel', value: roleChange.target.role },
            { label: 'Nouveau rôle', value: roleChange.role },
          ]}
          onConfirm={handleExecuteRoleChange}
          onCancel={() => setRoleChange(null)}
        />
      )}

      {/* Delete User Modal */}
      {userToDelete && (
        <ConfirmModal
          isOpen
          title={`Supprimer le compte ${userToDelete.name} ?`}
          subtitle="Cet utilisateur perdra immédiatement tout accès à l'application."
          type="danger"
          confirmLabel="Oui, supprimer"
          cancelLabel="Annuler"
          summaryItems={[
            { label: 'Nom', value: userToDelete.name },
            { label: 'Email', value: userToDelete.email },
            { label: 'Rôle', value: userToDelete.role },
          ]}
          onConfirm={handleExecuteDelete}
          onCancel={() => setUserToDelete(null)}
        />
      )}
    </div>
  );
};
