import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser, 
  onAuthStateChanged, 
  signOut,
  signInWithPopup
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';

interface AuthContextType {
  user: any | null; // Changed to any to support both Firebase and Local users
  dbUser: any | null;
  idToken: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  dbUser: null,
  idToken: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  logout: async () => {},
  getToken: async () => null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [dbUser, setDbUser] = useState<any | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check local storage first
    const localToken = localStorage.getItem('localAuthToken');
    if (localToken) {
      setIdToken(localToken);
      fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localToken}`,
        },
      }).then(async res => {
        if (res.ok) {
          const data = await res.json();
          setDbUser(data);
          setUser({ displayName: data.name, email: data.email });
        } else {
          localStorage.removeItem('localAuthToken');
          setIdToken(null);
        }
        setLoading(false);
      }).catch(() => {
        setLoading(false);
      });
    } else {
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
          try {
            const token = await currentUser.getIdToken();
            setIdToken(token);
            // Sync with server
            const res = await fetch('/api/auth/sync', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
            });
            if (res.ok) {
              const data = await res.json();
              setDbUser(data);
            }
          } catch (err) {
            console.error('Failed to get token or sync user:', err);
          }
        } else {
          setIdToken(null);
          setDbUser(null);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (error) {
      console.error('Google Sign-In failed:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Identifiants incorrects.');
      }
      
      const { token, user: dbUserResponse } = await res.json();
      localStorage.setItem('localAuthToken', token);
      setIdToken(token);
      setDbUser(dbUserResponse);
      setUser({ displayName: dbUserResponse.name, email: dbUserResponse.email });
    } catch (error) {
      console.error('Email Sign-In failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('localAuthToken');
      await signOut(auth);
      setUser(null);
      setDbUser(null);
      setIdToken(null);
    } catch (error) {
      console.error('Sign-out failed:', error);
    }
  };

  const getToken = async () => {
    const localToken = localStorage.getItem('localAuthToken');
    if (localToken) return localToken;

    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken(true);
      setIdToken(token);
      return token;
    }
    return null;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        dbUser,
        idToken,
        loading,
        signInWithGoogle,
        signInWithEmail,
        logout,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
