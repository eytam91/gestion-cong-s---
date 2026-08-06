import { adminFirestore } from '../lib/firebase-admin.ts';

export interface DbUser {
  uid: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'HR Manager';
  password?: string;
  createdAt: string;
}

export async function getOrCreateUser(uid: string, email: string, name?: string): Promise<DbUser> {
  const userRef = adminFirestore.collection('users').doc(uid);
  const doc = await userRef.get();

  if (!doc.exists) {
    const newUser: DbUser = {
      uid,
      email,
      name: name || email.split('@')[0] || 'Utilisateur',
      role: 'HR Manager',
      createdAt: new Date().toISOString(),
    };
    await userRef.set(newUser);
    return newUser;
  }

  const existingData = doc.data() as DbUser;
  const updatedData: DbUser = {
    ...existingData,
    email: email || existingData.email,
    name: name || existingData.name || email.split('@')[0],
  };

  await userRef.set(updatedData, { merge: true });
  return updatedData;
}
