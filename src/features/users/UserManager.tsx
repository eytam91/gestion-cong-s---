import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Shield, Trash2, Search, RefreshCw, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import {
  DbUser,
  UserRole,
  deleteUserDoc,
  fetchUsers,
  setUserRole,
} from '@/services/firestoreService';
import { addActivityLog } from '@/features/audit/auditLogger';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'ADMIN (Administrateur Total)',
  'HR Manager': 'HR Manager (Gestionnaire RH)',
  PENDING: 'En attente de validation',
};

const ROLE_BADGE: Record<UserRole, string> = {
  ADMIN: 'bg-amber-100 text-amber-900 border-amber-200',
  'HR Manager': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  PENDING: 'bg-stone-100 text-stone-600 border-stone-300',
};

export const UserManager: React.FC = () => {
  const { dbUser } = useAuth();
  const [users, setUsers] = useState<DbUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userToDelete, setUserToDelete] = useState<DbUser | null>(null);
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    user: DbUser;
    role: UserRole;
  } | null>(null);

  const actor = useMemo(
    () => ({ uid: dbUser?.uid ?? '', name: dbUser?.name ?? 'Inconnu' }),
    [dbUser],
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await fetchUsers());
    } catch (err) {
      console.error('Failed to load users:', err);
      setError('Impossible de charger la liste des utilisateurs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const applyRoleChange = async () => {
    if (!pendingRoleChange) return;
    const { user, role } = pendingRoleChange;
    setPendingRoleChange(null);
    setError(null);

    try {
      await setUserRole(user.uid, role);
      setUsers((prev) => prev.map((u) => (u.uid === user.uid ? { ...u, role } : u)));
      await addActivityLog(
        {
          action: 'USER_ROLE_CHANGED',
          actionLabel: 'Modification de Rôle',
          details: `Rôle de ${user.name} (${user.email}) changé de ${user.role} vers ${role}.`,
          targetId: user.uid,
        },
        actor,
      );
    } catch (err) {
      console.error('Failed to change role:', err);
      setError(`Impossible de modifier le rôle de ${user.name}.`);
    }
  };

  const handleExecuteDelete = async () => {
    if (!userToDelete) return;
    const target = userToDelete;
    setUserToDelete(null);
    setError(null);

    try {
      await deleteUserDoc(target.uid);
      setUsers((prev) => prev.filter((u) => u.uid !== target.uid));
      await addActivityLog(
        {
          action: 'USER_DELETED',
          actionLabel: 'Suppression Utilisateur',
          details: `Révocation de l'accès de ${target.name} (${target.email}).`,
          targetId: target.uid,
        },
        actor,
      );
    } catch (err) {
      console.error('Failed to delete user:', err);
      setError(`Impossible de supprimer ${target.name}.`);
    }
  };

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) =>
      [u.name, u.email, u.role].some((field) => (field || '').toLowerCase().includes(term)),
    );
  }, [users, searchTerm]);

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
            Les comptes se créent par inscription. Un administrateur accorde ensuite l'accès.
          </p>
        </div>

        <button
          onClick={() => void loadUsers()}
          title="Rafraîchir"
          aria-label="Rafraîchir la liste des utilisateurs"
          className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-all cursor-pointer self-start"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-700 text-xs font-medium"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <p>{error}</p>
        </div>
      )}

      {pendingCount > 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-amber-900 text-xs font-medium">
          <Clock className="w-4 h-4 shrink-0 text-amber-600" />
          <p>
            {pendingCount} compte(s) en attente de validation. Attribuez-leur un rôle pour autoriser
            l'accès aux données RH.
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-100 flex items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="search"
              aria-label="Rechercher un utilisateur"
              placeholder="Rechercher un utilisateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <span className="text-xs text-stone-500 font-mono shrink-0">
            {filteredUsers.length} utilisateur(s)
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-stone-500 text-xs">
            Chargement des utilisateurs...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-stone-500 text-xs">Aucun utilisateur trouvé.</div>
        ) : (
          <ul className="divide-y divide-stone-100">
            {filteredUsers.map((u) => {
              const isSelf = u.uid === dbUser?.uid;
              return (
                <li
                  key={u.uid}
                  className="p-4 hover:bg-stone-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-700 font-bold uppercase text-sm border border-stone-200 shrink-0">
                      {u.name?.charAt(0) || u.email?.charAt(0) || 'U'}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-stone-900 truncate">
                        {u.name}
                        {isSelf && (
                          <span className="ml-2 text-[10px] font-semibold text-stone-500">
                            (vous)
                          </span>
                        )}
                      </h3>
                      <span className="text-xs text-stone-500 font-mono truncate block">
                        {u.email}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-[11px] px-2.5 py-1 rounded-md font-bold border ${ROLE_BADGE[u.role] ?? ROLE_BADGE.PENDING}`}
                    >
                      {u.role}
                    </span>

                    <label className="sr-only" htmlFor={`role-${u.uid}`}>
                      Rôle de {u.name}
                    </label>
                    <select
                      id={`role-${u.uid}`}
                      value={u.role}
                      disabled={isSelf}
                      title={isSelf ? 'Vous ne pouvez pas modifier votre propre rôle' : undefined}
                      onChange={(e) =>
                        setPendingRoleChange({ user: u, role: e.target.value as UserRole })
                      }
                      className="text-xs px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => setUserToDelete(u)}
                      disabled={isSelf}
                      title={
                        isSelf ? 'Vous ne pouvez pas supprimer votre propre compte' : 'Supprimer'
                      }
                      aria-label={`Supprimer ${u.name}`}
                      className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-stone-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {pendingRoleChange && (
        <ConfirmModal
          isOpen
          title={`Modifier le rôle de ${pendingRoleChange.user.name} ?`}
          subtitle="Le niveau d'accès aux données RH de cet utilisateur sera modifié immédiatement."
          type="save"
          confirmLabel="Confirmer le changement"
          cancelLabel="Annuler"
          summaryItems={[
            { label: 'Utilisateur', value: pendingRoleChange.user.name },
            { label: 'Rôle actuel', value: pendingRoleChange.user.role },
            { label: 'Nouveau rôle', value: pendingRoleChange.role },
          ]}
          onConfirm={() => void applyRoleChange()}
          onCancel={() => setPendingRoleChange(null)}
        />
      )}

      {userToDelete && (
        <ConfirmModal
          isOpen
          title={`Supprimer le compte ${userToDelete.name} ?`}
          type="danger"
          subtitle="Cet utilisateur perdra immédiatement l'accès aux données RH."
          warningMessage="Le compte d'authentification doit également être supprimé dans la console Firebase pour empêcher toute reconnexion."
          confirmLabel="Oui, révoquer l'accès"
          cancelLabel="Annuler"
          summaryItems={[
            { label: 'Nom', value: userToDelete.name },
            { label: 'Email', value: userToDelete.email },
            { label: 'Rôle', value: userToDelete.role },
          ]}
          onConfirm={() => void handleExecuteDelete()}
          onCancel={() => setUserToDelete(null)}
        />
      )}
    </div>
  );
};
