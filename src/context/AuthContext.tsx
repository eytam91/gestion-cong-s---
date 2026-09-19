import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { usernameToEmail } from '../lib/username';
import { DbUser, createUserProfile, getUserProfile } from '../services/firestoreService';

function frenchAuthError(code: string | undefined): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Identifiant ou mot de passe incorrect.';
    case 'auth/too-many-requests':
      return 'Trop de tentatives échouées. Réessayez dans quelques minutes.';
    case 'auth/email-already-in-use':
      return 'Un compte existe déjà avec cet identifiant.';
    case 'auth/weak-password':
      return 'Le mot de passe doit comporter au moins 6 caractères.';
    case 'auth/invalid-email':
      return "L'identifiant saisi n'est pas valide.";
    case 'auth/network-request-failed':
      return 'Connexion au serveur impossible. Vérifiez votre réseau.';
    case 'auth/popup-blocked':
      return 'La fenêtre Google a été bloquée par le navigateur.';
    case 'auth/popup-closed-by-user':
      return 'Connexion annulée : la fenêtre Google a été fermée.';
    case 'auth/unauthorized-domain':
      return "Ce domaine n'est pas autorisé dans la console Firebase.";
    case 'auth/operation-not-allowed':
      return "Ce mode de connexion n'est pas activé dans ce projet Firebase.";
    default:
      return 'Erreur lors de la connexion. Veuillez réessayer.';
  }
}

interface AuthContextType {
  user: FirebaseUser | null;
  dbUser: DbUser | null;
  loading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isPending: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (usernameOrEmail: string, password: string) => Promise<void>;
  registerNewAccount: (
    usernameOrEmail: string,
    fullName: string,
    password: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  dbUser: null,
  loading: true,
  isAdmin: false,
  isStaff: false,
  isPending: false,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  registerNewAccount: async () => {},
  logout: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * The role is always read back from Firestore rather than cached in
   * localStorage, so a viewer cannot promote themselves by editing storage.
   */
  const loadProfile = useCallback(async (current: FirebaseUser): Promise<DbUser> => {
    const existing = await getUserProfile(current.uid);
    if (existing) return existing;
    return createUserProfile(
      current.uid,
      current.email || `${current.uid}@local.app`,
      current.displayName || '',
    );
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser || currentUser.isAnonymous) {
        setUser(null);
        setDbUser(null);
        setLoading(false);
        return;
      }

      setUser(currentUser);
      try {
        setDbUser(await loadProfile(currentUser));
      } catch (err) {
        console.error('Impossible de charger le profil utilisateur:', err);
        setDbUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (auth.currentUser) {
      setDbUser(await loadProfile(auth.currentUser));
    }
  }, [loadProfile]);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (error) {
      throw new Error(frenchAuthError((error as { code?: string })?.code), { cause: error });
    }
  };

  const signInWithEmail = async (usernameOrEmail: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, usernameToEmail(usernameOrEmail), password);
    } catch (error) {
      throw new Error(frenchAuthError((error as { code?: string })?.code), { cause: error });
    }
  };

  const registerNewAccount = async (
    usernameOrEmail: string,
    fullName: string,
    password: string,
  ) => {
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        usernameToEmail(usernameOrEmail),
        password,
      );
      const name = fullName.trim();
      if (name) {
        await updateProfile(credential.user, { displayName: name });
      }
      await createUserProfile(
        credential.user.uid,
        credential.user.email || usernameToEmail(usernameOrEmail),
        name,
      );
      await refreshProfile();
    } catch (error) {
      throw new Error(frenchAuthError((error as { code?: string })?.code), { cause: error });
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setDbUser(null);
  };

  const isAdmin = dbUser?.role === 'ADMIN';
  const isStaff = isAdmin || dbUser?.role === 'HR Manager';
  const isPending = Boolean(user) && dbUser?.role === 'PENDING';

  return (
    <AuthContext.Provider
      value={{
        user,
        dbUser,
        loading,
        isAdmin,
        isStaff,
        isPending,
        signInWithGoogle,
        signInWithEmail,
        registerNewAccount,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
