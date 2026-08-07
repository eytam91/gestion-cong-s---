import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

const databaseId = (firebaseConfig as any).firestoreDatabaseId;

export const db = databaseId
  ? initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
    }, databaseId)
  : initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
    });

