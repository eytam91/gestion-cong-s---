import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser, 
  onAuthStateChanged, 
  signOut,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { getOrCreateDbUser, DbUser, UserRole } from '../services/firestoreService';
import { addActivityLog } from '../utils/auditLogger';

/**
 * Maps short username to Firebase email format using the @local.app domain
 */
export function usernameToEmail(usernameOrEmail: string): string {
  const clean = usernameOrEmail.trim().toLowerCase();
  return clean.includes('@') ? clean : `${clean}@local.app`;
}

/**
 * Translates Firebase Auth error codes to helpful, user-friendly French messages
 */
export function formatAuthError(error: any): string {
  if (!error) return "Une erreur inattendue est survenue.";
  const code = error.code || '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return "Identifiant ou mot de passe incorrect. Veuillez vérifier vos accès.";
    case 'auth/email-already-in-use':
      return "Cet identifiant ou cette adresse email est déjà associé à un compte.";
    case 'auth/weak-password':
      return "Le mot de passe doit comporter au moins 6 caractères.";
    case 'auth/invalid-email':
      return "Le format de l'identifiant ou de l'adresse email est invalide.";
    case 'auth/user-disabled':
      return "Ce compte utilisateur a été désactivé par l'administrateur.";
    case 'auth/too-many-requests':
      return "Trop de tentatives infructueuses. Veuillez patienter un instant avant de réessayer.";
    case 'auth/popup-closed-by-user':
      return "Connexion annulée : la fenêtre de connexion Google a été fermée.";
    case 'auth/popup-blocked':
      return "La fenêtre de connexion Google a été bloquée par votre navigateur.";
    case 'auth/unauthorized-domain':
      return "Ce domaine n'est pas encore autorisé dans Firebase Console (Domaines autorisés).";
    case 'auth/network-request-failed':
      return "Impossible de joindre le serveur d'authentification. Vérifiez votre connexion Internet.";
    default:
      return error.message || "Erreur lors de l'authentification.";
  }
}

export interface AuthContextType {
  user: FirebaseUser | null;
  dbUser: DbUser | null;
  idToken: string | null;
  loading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isPending: boolean;
  isAuthenticated: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (emailOrUsername: string, pass: string) => Promise<void>;
  registerWithEmail: (emailOrUsername: string, pass: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  reloadUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  dbUser: null,
  idToken: null,
  loading: true,
  isAdmin: false,
  isStaff: false,
  isPending: false,
  isAuthenticated: false,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  registerWithEmail: async () => {},
  logout: async () => {},
  reloadUserProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfileForUser = async (currentUser: FirebaseUser) => {
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
      return profile;
    } catch (err) {
      console.error('Error fetching user profile from Firestore:', err);
      return null;
    }
  };

  useEffect(() => {
    // Restore cached profile on first mount for instant UI responsiveness
    const savedLocalUser = localStorage.getItem('local_db_user');
    if (savedLocalUser) {
      try {
        const parsed: DbUser = JSON.parse(savedLocalUser);
        setDbUser(parsed);
      } catch {
        localStorage.removeItem('local_db_user');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && !currentUser.isAnonymous) {
        setUser(currentUser);
        await fetchProfileForUser(currentUser);
      } else {
        setUser(null);
        setDbUser(null);
        setIdToken(null);
        localStorage.removeItem('local_db_user');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const reloadUserProfile = async () => {
    if (auth.currentUser) {
      await fetchProfileForUser(auth.currentUser);
    }
  };

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      if (result.user) {
        setUser(result.user);
        const profile = await fetchProfileForUser(result.user);
        
        addActivityLog({
          action: 'USER_LOGIN',
          actionLabel: 'Connexion Google Réussie',
          details: `Connexion Google : ${result.user.displayName || result.user.email} (${profile?.role || 'PENDING'})`,
          actor: {
            uid: result.user.uid,
            name: result.user.displayName || result.user.email || 'Utilisateur',
            email: result.user.email || undefined,
            role: profile?.role,
          }
        });
      }
    } catch (error: any) {
      console.error('Google Sign-In failed:', error);
      throw new Error(formatAuthError(error), { cause: error });
    }
  };

  const signInWithEmail = async (emailOrUsername: string, pass: string) => {
    try {
      const email = usernameToEmail(emailOrUsername);
      const result = await signInWithEmailAndPassword(auth, email, pass);
      if (result.user) {
        setUser(result.user);
        const profile = await fetchProfileForUser(result.user);

        addActivityLog({
          action: 'USER_LOGIN',
          actionLabel: 'Connexion Réussie',
          details: `Utilisateur authentifié : ${profile?.name || email} (${profile?.role || 'PENDING'})`,
          actor: {
            uid: result.user.uid,
            name: profile?.name || email,
            email: result.user.email || undefined,
            role: profile?.role,
          }
        });
      }
    } catch (error: any) {
      console.error('Email sign-in failed:', error);
      throw new Error(formatAuthError(error), { cause: error });
    }
  };

  const registerWithEmail = async (emailOrUsername: string, pass: string, fullName: string) => {
    try {
      const email = usernameToEmail(emailOrUsername);
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      if (result.user) {
        await updateProfile(result.user, { displayName: fullName.trim() });
        setUser(result.user);
        const profile = await getOrCreateDbUser(result.user.uid, email, fullName.trim());
        setDbUser(profile);
        localStorage.setItem('local_db_user', JSON.stringify(profile));

        addActivityLog({
          action: 'USER_REGISTERED',
          actionLabel: 'Nouveau Compte Créé',
          details: `Inscription : ${fullName} (${email}) - Statut: ${profile.role}`,
          actor: {
            uid: result.user.uid,
            name: fullName,
            email,
            role: profile.role,
          }
        });
      }
    } catch (error: any) {
      console.error('Registration failed:', error);
      throw new Error(formatAuthError(error), { cause: error });
    }
  };

  const logout = async () => {
    try {
      const currentActorName = dbUser?.name || user?.displayName || 'Utilisateur';
      const currentRole = dbUser?.role;
      const currentUid = user?.uid;

      await signOut(auth);
      setUser(null);
      setDbUser(null);
      setIdToken(null);
      localStorage.removeItem('local_db_user');

      if (currentUid) {
        addActivityLog({
          action: 'USER_LOGOUT',
          actionLabel: 'Déconnexion Utilisateur',
          details: `Session terminée pour : ${currentActorName}`,
          actor: {
            uid: currentUid,
            name: currentActorName,
            role: currentRole,
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const role: UserRole = dbUser?.role || 'PENDING';
  const isAdmin = role === 'ADMIN';
  const isStaff = role === 'ADMIN' || role === 'HR Manager';
  const isPending = role === 'PENDING';
  const isAuthenticated = Boolean(user);

  return (
    <AuthContext.Provider
      value={{
        user,
        dbUser,
        idToken,
        loading,
        isAdmin,
        isStaff,
        isPending,
        isAuthenticated,
        signInWithGoogle,
        signInWithEmail,
        registerWithEmail,
        logout,
        reloadUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
