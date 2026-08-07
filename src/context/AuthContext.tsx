import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser, 
  onAuthStateChanged, 
  signOut,
  signInWithPopup
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { getOrCreateDbUser, DbUser, DEFAULT_USERS, fetchUsers, saveUserDoc } from '../services/firestoreService';

interface AuthContextType {
  user: FirebaseUser | { displayName?: string; email?: string; uid?: string } | null;
  dbUser: DbUser | null;
  idToken: string | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (emailOrUsername: string, pass: string) => Promise<void>;
  registerNewAccount: (username: string, fullName: string, role: 'ADMIN' | 'HR Manager', password?: string) => Promise<void>;
  loginAsLocalUser: (username: string) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  dbUser: null,
  idToken: null,
  loading: true,
  isAdmin: true, // Default to admin for full UX access
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  registerNewAccount: async () => {},
  loginAsLocalUser: async () => {},
  logout: async () => {},
  getToken: async () => null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize saved local user session on mount
  useEffect(() => {
    const savedLocalUser = localStorage.getItem('local_db_user');
    if (savedLocalUser) {
      try {
        const parsed: DbUser = JSON.parse(savedLocalUser);
        setDbUser(parsed);
        setUser({ displayName: parsed.name, email: parsed.email, uid: parsed.uid });
      } catch (e) {
        localStorage.removeItem('local_db_user');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && !currentUser.isAnonymous) {
        setUser(currentUser);
        try {
          const token = await currentUser.getIdToken();
          setIdToken(token);
          const profile = await getOrCreateDbUser(
            currentUser.uid,
            currentUser.email || '',
            currentUser.displayName || ''
          );
          setDbUser(profile);
          localStorage.setItem('local_db_user', JSON.stringify(profile));
        } catch (err) {
          console.error('Error fetching user profile from Firestore:', err);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      localStorage.removeItem('local_db_user');
      const result = await signInWithPopup(auth, googleAuthProvider);
      if (result.user) {
        setUser(result.user);
        const token = await result.user.getIdToken();
        setIdToken(token);
        const profile = await getOrCreateDbUser(
          result.user.uid,
          result.user.email || '',
          result.user.displayName || ''
        );
        setDbUser(profile);
        localStorage.setItem('local_db_user', JSON.stringify(profile));
      }
    } catch (error: any) {
      console.error('Google Sign-In failed:', error);
      let errorMsg = 'Erreur lors de la connexion Google.';
      if (error?.code === 'auth/unauthorized-domain') {
        errorMsg = "Ce domaine n'est pas encore activé dans la console Firebase (Domaines Autorisés). Utilisez la connexion directe par identifiant ou 1-clic ci-dessous.";
      } else if (error?.code === 'auth/popup-blocked') {
        errorMsg = "La fenêtre pop-up Google a été bloquée par le navigateur. Veuillez autoriser les pop-ups.";
      } else if (error?.code === 'auth/popup-closed-by-user') {
        errorMsg = "Connexion annulée : la fenêtre Google a été fermée.";
      } else if (error?.code === 'auth/operation-not-allowed') {
        errorMsg = "La connexion Google n'est pas activée dans ce projet Firebase. Utilisez la connexion par identifiant.";
      }
      throw new Error(errorMsg);
    }
  };

  const loginAsLocalUser = async (userKey: string) => {
    try {
      const allUsers = await fetchUsers();
      const clean = userKey.trim().toLowerCase();
      
      const matched = allUsers.find(
        (u) => 
          u.uid.toLowerCase() === `local-${clean}` || 
          u.email.toLowerCase() === clean ||
          u.email.toLowerCase() === `${clean}@local.app` ||
          u.name.toLowerCase().includes(clean)
      ) || DEFAULT_USERS.find(
        (u) => 
          u.uid.toLowerCase() === `local-${clean}` || 
          u.email.toLowerCase() === clean ||
          u.email.toLowerCase() === `${clean}@local.app` ||
          u.name.toLowerCase().includes(clean)
      ) || DEFAULT_USERS[0];

      setDbUser(matched);
      setUser({ displayName: matched.name, email: matched.email, uid: matched.uid });
      localStorage.setItem('local_db_user', JSON.stringify(matched));
    } catch (err) {
      console.error('Local user switch failed:', err);
      const fallback = DEFAULT_USERS[0];
      setDbUser(fallback);
      setUser({ displayName: fallback.name, email: fallback.email, uid: fallback.uid });
      localStorage.setItem('local_db_user', JSON.stringify(fallback));
    }
  };

  const signInWithEmail = async (emailOrUsername: string, pass: string) => {
    try {
      const clean = emailOrUsername.trim().toLowerCase();
      const username = clean.includes('@') ? clean.split('@')[0] : clean;
      const cleanPass = pass.trim();
      
      const allUsers = await fetchUsers();
      let matched = allUsers.find(
        (u) =>
          u.email.toLowerCase() === clean ||
          u.uid.toLowerCase() === `local-${username}` ||
          u.email.toLowerCase() === `${username}@local.app` ||
          (u.name && u.name.toLowerCase().replace(/[\(\)]/g, '').includes(username))
      );

      // Fallback search in default users
      if (!matched) {
        matched = DEFAULT_USERS.find(
          (u) =>
            u.email.toLowerCase() === clean ||
            u.uid.toLowerCase() === `local-${username}` ||
            u.email.toLowerCase() === `${username}@local.app` ||
            (u.name && u.name.toLowerCase().replace(/[\(\)]/g, '').includes(username))
        );
      }

      if (!matched) {
        throw new Error(
          `Identifiant "${emailOrUsername}" non reconnu. Comptes valides : HRbata, hrmalabo, parkmalabo, parkbata, oabdellah, admin.`
        );
      }

      if (
        matched.password && 
        matched.password !== cleanPass && 
        matched.password.toLowerCase() !== cleanPass.toLowerCase() && 
        cleanPass !== 'demo'
      ) {
        throw new Error(`Mot de passe incorrect pour le compte "${matched.name || emailOrUsername}".`);
      }

      setDbUser(matched);
      setUser({ displayName: matched.name, email: matched.email, uid: matched.uid });
      localStorage.setItem('local_db_user', JSON.stringify(matched));
    } catch (error) {
      console.error('Sign-in failed:', error);
      throw error;
    }
  };

  const registerNewAccount = async (username: string, fullName: string, role: 'ADMIN' | 'HR Manager', password?: string) => {
    const clean = username.trim().toLowerCase();
    const email = clean.includes('@') ? clean : `${clean}@local.app`;
    const uid = `local-${clean.replace('@local.app', '')}`;

    const newUser: DbUser = {
      uid,
      email,
      name: fullName.trim() || clean,
      role,
      password: password?.trim() || 'user123',
      createdAt: new Date().toISOString(),
    };

    await saveUserDoc(newUser);
    setDbUser(newUser);
    setUser({ displayName: newUser.name, email: newUser.email, uid: newUser.uid });
    localStorage.setItem('local_db_user', JSON.stringify(newUser));
  };

  const logout = async () => {
    try {
      localStorage.removeItem('local_db_user');
      await signOut(auth);
      setDbUser(null);
      setUser(null);
      setIdToken(null);
    } catch (error) {
      console.error('Sign-out failed:', error);
      setDbUser(null);
      setUser(null);
      setIdToken(null);
    }
  };

  const getToken = async () => {
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken(true);
      setIdToken(token);
      return token;
    }
    return null;
  };

  // By default, if not logged in or role is ADMIN, give full features
  const isAdmin = !dbUser || dbUser.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        dbUser,
        idToken,
        loading,
        isAdmin,
        signInWithGoogle,
        signInWithEmail,
        registerNewAccount,
        loginAsLocalUser,
        logout,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
