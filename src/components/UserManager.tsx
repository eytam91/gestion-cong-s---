import React, { useState, useEffect } from 'react';
import { User, Shield, ShieldCheck, Trash2, UserPlus, Search, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DbUser, fetchUsers, saveUserDoc, deleteUserDoc } from '../services/firestoreService';

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

  const handleDelete = async (uid: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur dans Cloud Firestore ?')) return;
    try {
      await deleteUserDoc(uid);
      setUsers((prev) => prev.filter((u) => u.uid !== uid));
    } catch (err) {
      console.error('Failed to delete user:', err);
      alert('Erreur lors de la suppression de l’utilisateur.');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;

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
    } catch (err) {
      console.error('Failed to create user:', err);
      alert('Erreur lors de la création de l’utilisateur.');
    }
  };

  const filteredUsers = users.filter((u) =>
    (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.role || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            onClick={() => setShowAddModal(true)}
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
                  <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-700 font-bold uppercase text-sm border border-stone-200">
                    {u.name?.charAt(0) || u.email?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">{u.name}</h3>
                    <p className="text-xs text-stone-500">{u.email}</p>
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
                    onClick={() => handleDelete(u.uid)}
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
          <div className="bg-white rounded-2xl border border-stone-200 p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-base font-bold text-stone-900">Créer un nouveau compte utilisateur</h3>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Nom Complet</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Jean Dupont"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Identifiant / Email</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: jean.dupont ou jdupont"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Mot de passe</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Rôle</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'ADMIN' | 'HR Manager')}
                  className="w-full text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                >
                  <option value="HR Manager">HR Manager (Gestionnaire RH)</option>
                  <option value="ADMIN">ADMIN (Administrateur Total)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
    </div>
  );
};
