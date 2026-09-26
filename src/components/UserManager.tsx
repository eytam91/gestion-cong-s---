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
  AlertCircle,
  Clock,
  Check,
  UserCheck,
  X
} from 'lucide-react';
import { useAuth, usernameToEmail } from '../context/AuthContext';
import { DbUser, UserRole, fetchUsers, saveUserDoc, deleteUserDoc, setUserRole } from '../services/firestoreService';
import { ConfirmModal } from './ConfirmModal';
import { addActivityLog } from '../utils/auditLogger';

export const UserManager: React.FC = () => {
  const { user: currentAuthUser, dbUser: currentDbUser, isAdmin } = useAuth();
  const [users, setUsers] = useState<DbUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');

  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('HR Manager');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmittedAttempt, setIsSubmittedAttempt] = useState(false);

  // Confirmation state
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<DbUser | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

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

  const handleRoleChange = async (targetUser: DbUser, newRole: UserRole) => {
    try {
      await setUserRole(targetUser.uid, newRole, currentAuthUser?.uid);
      setUsers((prev) => 
        prev.map((u) => u.uid === targetUser.uid ? { ...u, role: newRole, approvedAt: new Date().toISOString() } : u)
      );

      addActivityLog({
        action: 'ROLE_CHANGED',
        actionLabel: 'Changement de Rôle',
        details: `Rôle de ${targetUser.name || targetUser.email} modifié en : ${newRole}`,
        actorUid: currentAuthUser?.uid,
        actorName: currentDbUser?.name || 'Administrateur',
        actorRole: currentDbUser?.role,
      });

      setActionNotice(`Rôle de ${targetUser.name} mis à jour : ${newRole}`);
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err) {
      console.error('Failed to change role:', err);
      alert('Erreur lors de la mise à jour du rôle.');
    }
  };

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
      const email = usernameToEmail(cleanUsername);
      const isDuplicate = users.some(
        (u) => u.email.toLowerCase() === email.toLowerCase() || u.uid === `user-${cleanUsername}`
      );
      if (isDuplicate) {
        errs.username = `L'identifiant "${cleanUsername}" est déjà attribué.`;
      }
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
      const email = usernameToEmail(newUsername);
      const uid = `usr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

      const newDbUser: DbUser = {
        uid,
        email,
        name: newName.trim(),
        role: newRole,
        createdAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        approvedBy: currentAuthUser?.uid,
      };

      await saveUserDoc(newDbUser);
      setUsers((prev) => [newDbUser, ...prev]);
      setShowAddModal(false);
      setNewUsername('');
      setNewName('');
      setNewPassword('');
      setNewRole('HR Manager');
      setErrors({});
      setIsSubmittedAttempt(false);

      addActivityLog({
        action: 'ROLE_CHANGED',
        actionLabel: 'Utilisateur Créé par Admin',
        details: `Compte créé directement par admin : ${newDbUser.name} (${newDbUser.email}) avec rôle ${newDbUser.role}`,
        actorUid: currentAuthUser?.uid,
        actorName: currentDbUser?.name || 'Administrateur',
        actorRole: currentDbUser?.role,
      });

      setActionNotice(`Utilisateur ${newDbUser.name} créé avec succès.`);
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err) {
      console.error('Failed to create user:', err);
      alert('Erreur lors de la création de l’utilisateur.');
    }
  };

  const handleExecuteDelete = async () => {
    if (!userToDelete) return;
    const uid = userToDelete.uid;
    const deletedName = userToDelete.name;
    setUserToDelete(null);
    try {
      await deleteUserDoc(uid);
      setUsers((prev) => prev.filter((u) => u.uid !== uid));

      addActivityLog({
        action: 'ROLE_CHANGED',
        actionLabel: 'Utilisateur Supprimé',
        details: `Compte utilisateur supprimé : ${deletedName}`,
        actorUid: currentAuthUser?.uid,
        actorName: currentDbUser?.name || 'Administrateur',
        actorRole: currentDbUser?.role,
      });

      setActionNotice(`Compte ${deletedName} supprimé.`);
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err) {
      console.error('Failed to delete user:', err);
      alert('Erreur lors de la suppression de l’utilisateur.');
    }
  };

  const pendingUsers = users.filter((u) => u.role === 'PENDING');
  const countAdmins = users.filter((u) => u.role === 'ADMIN').length;
  const countHr = users.filter((u) => u.role === 'HR Manager').length;

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = !term || (
      (u.name || '').toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term) ||
      (u.role || '').toLowerCase().includes(term)
    );
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <span>Gestion des Utilisateurs & Habilitations</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 font-mono font-bold">
              {users.length} compte(s)
            </span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Validation des inscriptions en attente, affectation des rôles (ADMIN vs HR Manager) et gestion des accès Cloud Firestore.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadUsers}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold px-3 py-2 rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-amber-400" />
              <span>Créer un Utilisateur</span>
            </button>
          )}
        </div>
      </div>

      {actionNotice && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-stone-400 hover:text-stone-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Pending Approval Alert Banner */}
      {pendingUsers.length > 0 && (
        <div className="p-5 rounded-2xl bg-amber-50/90 border border-amber-300 text-amber-950 space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-amber-950">
                {pendingUsers.length} inscription(s) en attente d'approbation
              </h3>
              <p className="text-2xs text-amber-800">
                Ces utilisateurs ne peuvent pas accéder aux données du personnel tant qu'ils n'ont pas été promus en HR Manager ou Administrateur.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {pendingUsers.map((u) => (
              <div key={u.uid} className="bg-white p-3 rounded-xl border border-amber-200 flex flex-col justify-between gap-2.5 shadow-2xs">
                <div>
                  <p className="font-bold text-xs text-stone-900 truncate">{u.name || 'Sans nom'}</p>
                  <p className="text-2xs text-stone-500 font-mono truncate">{u.email}</p>
                  <p className="text-3xs text-stone-400 mt-1">
                    Inscrit le : {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 pt-1 border-t border-stone-100">
                  <button
                    onClick={() => handleRoleChange(u, 'HR Manager')}
                    className="flex-1 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-2xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    title="Promouvoir en Gestionnaire RH"
                  >
                    <Check className="w-3 h-3 text-teal-200" />
                    <span>Approuver (RH)</span>
                  </button>
                  <button
                    onClick={() => handleRoleChange(u, 'ADMIN')}
                    className="px-2.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-2xs font-bold transition-colors cursor-pointer"
                    title="Promouvoir en Administrateur"
                  >
                    <span>Admin</span>
                  </button>
                  <button
                    onClick={() => setUserToDelete(u)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Rejeter / Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher par nom, email ou rôle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-xs bg-stone-50 text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all font-medium"
          />
        </div>

        {/* Role Filter Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setRoleFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              roleFilter === 'ALL'
                ? 'bg-stone-900 text-white shadow-2xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Tous ({users.length})
          </button>
          <button
            onClick={() => setRoleFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              roleFilter === 'PENDING'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Clock className="w-3 h-3" />
            En Attente ({pendingUsers.length})
          </button>
          <button
            onClick={() => setRoleFilter('HR Manager')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              roleFilter === 'HR Manager'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'bg-teal-50 text-teal-900 border border-teal-200 hover:bg-teal-100'
            }`}
          >
            <UserCheck className="w-3 h-3" />
            RH Managers ({countHr})
          </button>
          <button
            onClick={() => setRoleFilter('ADMIN')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              roleFilter === 'ADMIN'
                ? 'bg-purple-700 text-white shadow-2xs'
                : 'bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100'
            }`}
          >
            <Shield className="w-3 h-3" />
            Admins ({countAdmins})
          </button>
        </div>
      </div>

      {/* Users Grid */}
      {filteredUsers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
            <User className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-stone-900">Aucun utilisateur trouvé</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Aucun compte ne correspond aux critères de recherche ou de filtre sélectionnés.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((u) => {
            const isCurrentUser = currentAuthUser?.uid === u.uid;

            return (
              <div
                key={u.uid}
                className={`bg-white rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-all shadow-xs ${
                  u.role === 'PENDING'
                    ? 'border-amber-300 ring-2 ring-amber-100'
                    : 'border-stone-200/80 hover:border-amber-300'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-xs shrink-0 ${
                        u.role === 'ADMIN' 
                          ? 'bg-purple-900' 
                          : u.role === 'PENDING'
                          ? 'bg-amber-600'
                          : 'bg-teal-800'
                      }`}>
                        {u.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-stone-900 text-sm truncate">{u.name}</p>
                          {isCurrentUser && (
                            <span className="text-3xs px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 font-bold border border-stone-200">
                              Vous
                            </span>
                          )}
                        </div>
                        <p className="text-2xs text-stone-500 font-mono truncate">{u.email}</p>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-3xs font-bold uppercase tracking-wider shrink-0 ${
                      u.role === 'ADMIN'
                        ? 'bg-purple-100 text-purple-900 border border-purple-200'
                        : u.role === 'PENDING'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-teal-100 text-teal-900 border border-teal-200'
                    }`}>
                      {u.role}
                    </span>
                  </div>

                  <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-100 space-y-1 text-2xs text-stone-500">
                    <div className="flex justify-between">
                      <span>Créé le :</span>
                      <span className="font-medium text-stone-700">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('fr-FR') : 'Non renseigné'}
                      </span>
                    </div>
                    {u.approvedAt && (
                      <div className="flex justify-between">
                        <span>Approuvé le :</span>
                        <span className="font-medium text-stone-700">
                          {new Date(u.approvedAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Role Switcher & Delete Button */}
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-1">
                    <label className="text-3xs text-stone-400 font-bold uppercase">Rôle :</label>
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                      disabled={!isAdmin}
                      className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-900 disabled:opacity-50 cursor-pointer"
                    >
                      <option value="PENDING">PENDING (En Attente)</option>
                      <option value="HR Manager">HR Manager (Staff RH)</option>
                      <option value="ADMIN">ADMIN (Administrateur)</option>
                    </select>
                  </div>

                  {isAdmin && !isCurrentUser && (
                    <button
                      onClick={() => setUserToDelete(u)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Supprimer ce compte"
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

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-stone-900 text-white flex items-center justify-center shadow-xs">
                  <UserPlus className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">Créer un Nouvel Utilisateur</h3>
                  <p className="text-xs text-stone-500">Ajout direct avec rôle actif par un administrateur</p>
                </div>
              </div>
              <button 
                onClick={handleRequestClose}
                className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePreCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-2xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Nom Complet *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="ex: Aminata Touré"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 font-medium"
                />
                {errors.name && <p className="text-2xs text-rose-600 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-2xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Identifiant ou Email *
                </label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="ex: atoure ou atoure@entreprise.com"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 font-medium"
                />
                {errors.username && <p className="text-2xs text-rose-600 mt-1">{errors.username}</p>}
              </div>

              <div>
                <label className="block text-2xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Rôle Attribué *
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 font-medium"
                >
                  <option value="HR Manager">HR Manager (Gestionnaire RH)</option>
                  <option value="ADMIN">ADMIN (Administrateur Total)</option>
                  <option value="PENDING">PENDING (En attente)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={handleRequestClose}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-800 rounded-xl transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-amber-400" />
                  <span>Créer le Compte</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Save Modal */}
      <ConfirmModal
        isOpen={showSaveConfirmModal}
        title="Créer ce compte utilisateur ?"
        subtitle="Confirmez-vous la création de ce profil avec les habilitations sélectionnées ?"
        type="save"
        confirmLabel="Confirmer la création"
        cancelLabel="Vérifier la saisie"
        summaryItems={[
          { label: "Nom Complet", value: newName },
          { label: "Email / Identifiant", value: usernameToEmail(newUsername) },
          { label: "Rôle Initial", value: newRole }
        ]}
        onConfirm={handleExecuteCreate}
        onCancel={() => setShowSaveConfirmModal(false)}
      />

      {/* Confirm Discard Modal */}
      <ConfirmModal
        isOpen={showCancelConfirmModal}
        title="Modifications non enregistrées"
        subtitle="Vous avez des informations saisies dans le formulaire."
        type="warning"
        confirmLabel="Quitter sans créer"
        cancelLabel="Continuer"
        onConfirm={() => {
          setShowCancelConfirmModal(false);
          setShowAddModal(false);
          setErrors({});
          setIsSubmittedAttempt(false);
        }}
        onCancel={() => setShowCancelConfirmModal(false)}
      />

      {/* Confirm Delete Modal */}
      {userToDelete && (
        <ConfirmModal
          isOpen={Boolean(userToDelete)}
          title={`Supprimer le compte de ${userToDelete.name} ?`}
          subtitle="Cette action révoquera immédiatement tous les accès de cet utilisateur."
          type="danger"
          confirmLabel="Supprimer définitivement"
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
