import React, { useState, useEffect } from 'react';
import { User, Shield, ShieldCheck, Trash2, UserPlus, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface DbUser {
  id: number;
  uid: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

export const UserManager: React.FC = () => {
  const { idToken } = useAuth();
  const [users, setUsers] = useState<DbUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('HR Manager');

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (idToken) fetchUsers();
  }, [idToken]);

  const handleDelete = async (uid: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;
    try {
      const res = await fetch(`/api/users/${uid}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` }
      });
      if (res.ok) {
        setUsers(users.filter(u => u.uid !== uid));
      } else {
        alert('Erreur lors de la suppression');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          username: newUsername,
          name: newName,
          pass: newPassword,
          role: newRole,
        })
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewUsername('');
        setNewName('');
        setNewPassword('');
        setNewRole('HR Manager');
        fetchUsers();
      } else {
        const error = await res.json();
        alert(`Erreur: ${error.error}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-stone-900">Gestion des Utilisateurs</h2>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Gérez les accès administrateurs et RH de l'application.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-2xs"
        >
          <UserPlus className="w-4 h-4" />
          Ajouter un compte
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-100">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-stone-500">Chargement...</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredUsers.map((u) => (
              <div key={u.uid} className="p-4 hover:bg-stone-50 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 font-bold uppercase">
                    {u.name?.charAt(0) || u.email.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">{u.name}</h3>
                    <p className="text-xs text-stone-500">{u.email.split('@')[0]}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                    u.role === 'ADMIN' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {u.role === 'ADMIN' ? 'Administrateur' : 'Ressources Humaines'}
                  </span>
                  
                  {u.role !== 'ADMIN' && (
                    <button
                      onClick={() => handleDelete(u.uid)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6">
            <h3 className="text-lg font-bold text-stone-900 mb-4">Créer un utilisateur</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Nom Complet</label>
                <input
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl"
                  placeholder="Jean Dupont"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Identifiant de connexion</label>
                <input
                  required
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl"
                  placeholder="jean.dupont"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Mot de passe</label>
                <input
                  required
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Rôle</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl"
                >
                  <option value="HR Manager">Ressources Humaines</option>
                  <option value="ADMIN">Administrateur</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-bold text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                >
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
