import React, { useState, useEffect } from 'react';
import { 
  User, 
  Shield, 
  ShieldCheck, 
  Trash2, 
  UserPlus, 
  Search, 
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  Mail,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DbUser, fetchUsers, saveUserDoc, deleteUserDoc } from '../services/firestoreService';
import { ConfirmModal } from './ConfirmModal';

export const UserManager: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<DbUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'ADMIN' | 'HR Manager'>('HR Manager');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmittedAttempt, setIsSubmittedAttempt] = useState(false);

  // Confirmation state
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<DbUser | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const isFormDirty = (): boolean => {
    return Boolean(newUsername.trim() || newName.trim() || newPassword.trim());
  };

  const handleRequestClose = () => {
    if (isFormDirty()) {
      setShowCancelConfirmModal(true);
    } else {
      setShowAddModal(false);
      setErrors({});
      setIsSubmittedAttempt(false);
    }
  };

  const validateUserForm = (): boolean => {
    const errs: { [key: string]: string } = {};

    if (!newName.trim()) {
      errs.name = 'Le nom complet est obligatoire.';
    } else if (newName.trim().length < 2) {
      errs.name = 'Le nom doit comporter au moins 2 caractères.';
    }

    const cleanUsername = newUsername.trim().toLowerCase();
    if (!cleanUsername) {
      errs.username = 'L\'identifiant ou email est obligatoire.';
    } else if (cleanUsername.length < 3) {
      errs.username = 'L\'identifiant doit comporter au moins 3 caractères.';
    } else {
      const isDuplicate = users.some(
        (u) => 
          u.email.toLowerCase() === cleanUsername || 
          u.uid.toLowerCase() === `local-${cleanUsername.replace('@local.app', '')}`
      );
      if (isDuplicate) {
        errs.username = `L'identifiant "${cleanUsername}" existe déjà.`;
      }
    }

    if (!newPassword.trim()) {
      errs.password = 'Le mot de passe est obligatoire.';
    } else if (newPassword.trim().length < 4) {
      errs.password = 'Le mot de passe doit comporter au moins 4 caractères.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePreCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittedAttempt(true);
    if (!validateUserForm()) {
      return;
    }
    setShowSaveConfirmModal(true);
  };

  const handleExecuteCreate = async () => {
    setShowSaveConfirmModal(false);
    try {
      const clean = newUsername.trim().toLowerCase();
      const email = clean.includes('@') ? clean : `${clean}@local.app`;
      const uid = `local-${clean.replace('@local.app', '')}`;

      const newDbUser: DbUser = {
        uid,
        email,
        name: newName.trim() || clean,
        role: newRole,
        password: newPassword.trim() || 'user123',
        createdAt: new Date().toISOString(),
      };

      await saveUserDoc(newDbUser);
      setUsers((prev) => [newDbUser, ...prev.filter((u) => u.uid !== uid)]);
      setShowAddModal(false);
      setNewUsername('');
      setNewName('');
      setNewPassword('');
      setNewRole('HR Manager');
      setErrors({});
      setIsSubmittedAttempt(false);
    } catch (err) {
      console.error('Failed to create user:', err);
      alert('Erreur lors de la création de l’utilisateur.');
    }
  };

  const handleExecuteDelete = async () => {
    if (!userToDelete) return;
    const uid = userToDelete.uid;
    setUserToDelete(null);
    try {
      await deleteUserDoc(uid);
      setUsers((prev) => prev.filter((u) => u.uid !== uid));
    } catch (err) {
      console.error('Failed to delete user:', err);
      alert('Erreur lors de la suppression de l’utilisateur.');
    }
  };

  const filteredUsers = users.filter((u) =>
    (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.role || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isNameValid = newName.trim().length >= 2;
  const isUsernameValid = newUsername.trim().length >= 3;
  const isPasswordValid = newPassword.trim().length >= 4;
  const isFormFullyValid = isNameValid && isUsernameValid && isPasswordValid;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-stone-900">Gestion des Utilisateurs & Rôles</h2>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Gérez les accès administrateurs et RH enregistrés dans Cloud Firestore.
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
          <button
            onClick={() => {
              setNewName('');
              setNewUsername('');
              setNewPassword('');
              setNewRole('HR Manager');
              setErrors({});
              setIsSubmittedAttempt(false);
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Ajouter un compte
          </button>
        </div>
      </div>

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
            {filteredUsers.map((u) => (
              <div key={u.uid} className="p-4 hover:bg-stone-50 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-700 font-bold uppercase text-sm border border-stone-200 shrink-0">
                    {u.name?.charAt(0) || u.email?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">{u.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <span className="text-xs text-stone-500 font-mono">{u.email}</span>
                      {u.password && (
                        <span className="text-[10px] bg-stone-100 text-stone-600 font-mono px-1.5 py-0.2 rounded border border-stone-200">
                          Mot de passe: <strong>{u.password}</strong>
                        </span>
                      )}
                    </div>
                    <span className="text-3xs text-stone-400 font-mono">ID: {u.uid}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-md font-bold ${
                      u.role === 'ADMIN'
                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    }`}
                  >
                    {u.role}
                  </span>
                  <button
                    onClick={() => setUserToDelete(u)}
                    title="Supprimer"
                    className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 max-w-md w-full shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-stone-900">Créer un nouveau compte utilisateur</h3>

            {isSubmittedAttempt && Object.keys(errors).length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-800">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Informations incomplètes :</p>
                  <ul className="list-disc pl-4 text-2xs mt-0.5">
                    {Object.values(errors).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <form onSubmit={handlePreCreate} className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-2xs font-bold text-stone-700 uppercase">Nom Complet *</label>
                  {isNameValid && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                </div>
                <input
                  type="text"
                  required
                  placeholder="Ex: Jean Dupont"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    if (errors.name) {
                      setErrors(prev => { const n = { ...prev }; delete n.name; return n; });
                    }
                  }}
                  className={`w-full text-xs px-3.5 py-2.5 bg-stone-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none ${
                    errors.name ? 'border-red-500 ring-2 ring-red-200' : 'border-stone-200'
                  }`}
                />
                {errors.name && <p className="text-2xs text-red-600 mt-1">{errors.name}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-2xs font-bold text-stone-700 uppercase">Identifiant / Email *</label>
                  {isUsernameValid && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                </div>
                <input
                  type="text"
                  required
                  placeholder="Ex: HRbata, hrmalabo, parkmalabo ou admin"
                  value={newUsername}
                  onChange={(e) => {
                    setNewUsername(e.target.value);
                    if (errors.username) {
                      setErrors(prev => { const n = { ...prev }; delete n.username; return n; });
                    }
                  }}
                  className={`w-full text-xs px-3.5 py-2.5 bg-stone-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none ${
                    errors.username ? 'border-red-500 ring-2 ring-red-200' : 'border-stone-200'
                  }`}
                />
                {errors.username && <p className="text-2xs text-red-600 mt-1">{errors.username}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-2xs font-bold text-stone-700 uppercase">Mot de passe *</label>
                  {isPasswordValid && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (errors.password) {
                      setErrors(prev => { const n = { ...prev }; delete n.password; return n; });
                    }
                  }}
                  className={`w-full text-xs px-3.5 py-2.5 bg-stone-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none ${
                    errors.password ? 'border-red-500 ring-2 ring-red-200' : 'border-stone-200'
                  }`}
                />
                {errors.password && <p className="text-2xs text-red-600 mt-1">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-2xs font-bold text-stone-700 uppercase mb-1">Rôle et Permissions *</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'ADMIN' | 'HR Manager')}
                  className="w-full text-xs px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold"
                >
                  <option value="HR Manager">HR Manager (Gestionnaire RH)</option>
                  <option value="ADMIN">ADMIN (Administrateur Total)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={handleRequestClose}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs cursor-pointer"
                >
                  Créer le compte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Save Confirm Modal */}
      <ConfirmModal
        isOpen={showSaveConfirmModal}
        title="Confirmer la création de ce compte ?"
        subtitle="Vérifiez les identifiants de ce nouvel utilisateur avant enregistrement dans Firestore."
        type="save"
        confirmLabel="Confirmer la création"
        cancelLabel="Continuer la saisie"
        summaryItems={[
          { label: "Nom Complet", value: newName },
          { label: "Identifiant / Email", value: newUsername.includes('@') ? newUsername : `${newUsername}@local.app` },
          { label: "Rôle", value: newRole }
        ]}
        onConfirm={handleExecuteCreate}
        onCancel={() => setShowSaveConfirmModal(false)}
      />

      {/* Cancel Dirty Warning Modal */}
      <ConfirmModal
        isOpen={showCancelConfirmModal}
        title="Abandonner la création de compte ?"
        subtitle="Des informations ont été saisies dans le formulaire."
        type="warning"
        confirmLabel="Quitter sans créer"
        cancelLabel="Continuer la saisie"
        warningMessage="Les données renseignées ne seront pas sauvegardées."
        onConfirm={() => {
          setShowCancelConfirmModal(false);
          setShowAddModal(false);
        }}
        onCancel={() => setShowCancelConfirmModal(false)}
      />

      {/* Delete User Modal */}
      {userToDelete && (
        <ConfirmModal
          isOpen={Boolean(userToDelete)}
          title={`Supprimer le compte ${userToDelete.name} ?`}
          subtitle="Cet utilisateur ne pourra plus se connecter à l'application."
          type="danger"
          confirmLabel="Oui, supprimer"
          cancelLabel="Annuler"
          summaryItems={[
            { label: "Nom", value: userToDelete.name },
            { label: "Email", value: userToDelete.email },
            { label: "Rôle", value: userToDelete.role }
          ]}
          onConfirm={handleExecuteDelete}
          onCancel={() => setUserToDelete(null)}
        />
      )}
    </div>
  );
};
