import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser, 
  onAuthStateChanged, 
  signOut,
  signInWithPopup,
  signInAnonymously
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { getOrCreateDbUser, DbUser, DEFAULT_USERS, fetchUsers } from '../services/firestoreService';

interface AuthContextType {
  user: FirebaseUser | { displayName?: string; email?: string; uid?: string } | null;
  dbUser: DbUser | null;
  idToken: string | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  loginAsLocalUser: (username: string) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  dbUser: null,
  idToken: null,
  loading: true,
  isAdmin: false,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  loginAsLocalUser: async () => {},
  logout: async () => {},
  getToken: async () => null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize Firebase Auth listener
  useEffect(() => {
    // Check if a local user session is stored
    const savedLocalUser = localStorage.getItem('local_db_user');
    if (savedLocalUser) {
      try {
        const parsed = JSON.parse(savedLocalUser);
        setDbUser(parsed);
        setUser({ displayName: parsed.name, email: parsed.email, uid: parsed.uid });
      } catch (e) {
        localStorage.removeItem('local_db_user');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // If logged in via Google / real account
        if (!currentUser.isAnonymous) {
          setUser(currentUser);
          const token = await currentUser.getIdToken();
          setIdToken(token);
          try {
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
        } else {
          // Anonymous user for basic read/write access
          if (!localStorage.getItem('local_db_user')) {
            setUser(currentUser);
            const defaultGuestUser: DbUser = {
              uid: currentUser.uid,
              email: 'invite@rh.app',
              name: 'Utilisateur Invité',
              role: 'ADMIN',
              createdAt: new Date().toISOString()
            };
            setDbUser(defaultGuestUser);
          }
        }
      } else {
        // Automatically sign in anonymously to ensure request.auth != null in Firestore rules
        try {
          await signInAnonymously(auth);
        } catch (anonErr) {
          console.warn('Anonymous sign-in error:', anonErr);
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
    } catch (error) {
      console.error('Google Sign-In failed:', error);
      throw error;
    }
  };

  const loginAsLocalUser = async (username: string) => {
    try {
      const allUsers = await fetchUsers();
      const matched = allUsers.find(
        (u) => u.uid === `local-${username}` || u.email.startsWith(username)
      );

      if (matched) {
        setDbUser(matched);
        setUser({ displayName: matched.name, email: matched.email, uid: matched.uid });
        localStorage.setItem('local_db_user', JSON.stringify(matched));
      } else {
        // Fallback default user
        const def = DEFAULT_USERS.find((u) => u.uid === `local-${username}`) || DEFAULT_USERS[0];
        setDbUser(def);
        setUser({ displayName: def.name, email: def.email, uid: def.uid });
        localStorage.setItem('local_db_user', JSON.stringify(def));
      }
    } catch (err) {
      console.error('Local user switch failed:', err);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      const clean = email.trim().toLowerCase();
      const username = clean.includes('@') ? clean.split('@')[0] : clean;
      
      const allUsers = await fetchUsers();
      const matched = allUsers.find(
        (u) =>
          u.email.toLowerCase() === clean ||
          u.uid === `local-${username}` ||
          u.email.toLowerCase() === `${username}@local.app`
      );

      if (!matched) {
        throw new Error('Utilisateur non trouvé.');
      }

      if (matched.password && matched.password !== pass) {
        throw new Error('Mot de passe incorrect.');
      }

      setDbUser(matched);
      setUser({ displayName: matched.name, email: matched.email, uid: matched.uid });
      localStorage.setItem('local_db_user', JSON.stringify(matched));
    } catch (error) {
      console.error('Email Sign-In failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('local_db_user');
      await signOut(auth);
      // Re-sign in anonymously for continuous Firestore connectivity
      await signInAnonymously(auth);
      const defaultGuestUser: DbUser = {
        uid: 'guest',
        email: 'invite@rh.app',
        name: 'Utilisateur Invité',
        role: 'ADMIN',
        createdAt: new Date().toISOString()
      };
      setDbUser(defaultGuestUser);
      setUser(null);
      setIdToken(null);
    } catch (error) {
      console.error('Sign-out failed:', error);
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

  const isAdmin = dbUser?.role === 'ADMIN' || !dbUser; // Admin by default in demo app

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
