import { db } from './index.ts';
import { users } from './schema.ts';

export async function getOrCreateUser(uid: string, email: string, name?: string) {
  const result = await db.insert(users)
    .values({
      uid,
      email,
      name: name || email.split('@')[0],
      role: 'HR Manager',
    })
    .onConflictDoUpdate({
      target: users.uid,
      set: {
        email,
        name: name || email.split('@')[0],
      },
    })
    .returning();

  return result[0];
}
