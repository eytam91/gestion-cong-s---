import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Employee, LeaveRecord } from '../types';
import { SAMPLE_DEMO_LEAVE_RECORDS } from '../utils/vacationCalc';
import { INITIAL_HR_EMPLOYEES } from '../data/hrEmployeesData';

const EMPLOYEES_COLL = 'employees';
const LEAVE_RECORDS_COLL = 'leave_records';
const USERS_COLL = 'users';

export interface DbUser {
  uid: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'HR Manager';
  password?: string;
  createdAt: string;
}

export const DEFAULT_USERS: DbUser[] = [
  { uid: 'local-admin', email: 'admin@local.app', name: 'Administrateur (admin)', role: 'ADMIN', password: 'admin123', createdAt: '2026-01-01T00:00:00.000Z' },
  { uid: 'local-hrbata', email: 'hrbata@local.app', name: 'RH Bata (HRbata)', role: 'HR Manager', password: 'hrbata123', createdAt: '2026-01-01T00:00:00.000Z' },
  { uid: 'local-hrmalabo', email: 'hrmalabo@local.app', name: 'RH Malabo (hrmalabo)', role: 'HR Manager', password: 'hrmalabo123', createdAt: '2026-01-01T00:00:00.000Z' },
  { uid: 'local-parkmalabo', email: 'parkmalabo@local.app', name: 'Parc Malabo (parkmalabo)', role: 'HR Manager', password: 'parkmalabo123', createdAt: '2026-01-01T00:00:00.000Z' },
  { uid: 'local-parkbata', email: 'parkbata@local.app', name: 'Parc Bata (parkbata)', role: 'HR Manager', password: 'parkbata123', createdAt: '2026-01-01T00:00:00.000Z' },
  { uid: 'local-oabdellah', email: 'oabdellah@local.app', name: 'O. Abdellah (oabdellah)', role: 'HR Manager', password: 'oabdellah123', createdAt: '2026-01-01T00:00:00.000Z' },
];

/**
 * Ensures initial collections and auth users exist in Firestore, keeping employee database clean.
 */
export async function initializeFirestoreData(): Promise<{ employees: Employee[]; leaveRecords: LeaveRecord[] }> {
  try {
    // Seed default authentication users if missing
    const userSnap = await getDocs(collection(db, USERS_COLL));
    if (userSnap.empty) {
      console.log('Seeding default auth user accounts in Firestore...');
      const batch = writeBatch(db);
      for (const u of DEFAULT_USERS) {
        const userRef = doc(db, USERS_COLL, u.uid);
        batch.set(userRef, u);
      }
      await batch.commit().catch((e) => console.warn('User seeding failed:', e));
    }

    const empSnap = await getDocs(collection(db, EMPLOYEES_COLL));
    let employees: Employee[] = [];
    empSnap.forEach((d) => {
      employees.push(d.data() as Employee);
    });

    // If Firestore is completely empty or has no employees, seed the complete 142 HR employee records
    if (employees.length === 0 && INITIAL_HR_EMPLOYEES.length > 0) {
      console.log('Seeding full enterprise HR employee records with documents into Firestore...');
      await batchSaveEmployees(INITIAL_HR_EMPLOYEES);
      employees = [...INITIAL_HR_EMPLOYEES];
    }

    const leaveSnap = await getDocs(collection(db, LEAVE_RECORDS_COLL));
    const leaveRecords: LeaveRecord[] = [];
    leaveSnap.forEach((d) => {
      leaveRecords.push(d.data() as LeaveRecord);
    });

    return { 
      employees: employees.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')), 
      leaveRecords: leaveRecords.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''))
    };
  } catch (error) {
    console.error('Failed to initialize or fetch Firestore data:', error);
    return { employees: [], leaveRecords: [] };
  }
}

// ----------------- EMPLOYEES -----------------

export async function fetchEmployees(): Promise<Employee[]> {
  try {
    const snap = await getDocs(collection(db, EMPLOYEES_COLL));
    const list: Employee[] = [];
    snap.forEach((d) => list.push(d.data() as Employee));
    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  } catch (err) {
    console.error('Error fetching employees from Firestore:', err);
    return [];
  }
}

/**
 * Helper to remove undefined fields recursively so Firestore doesn't throw invalid data errors
 */
function cleanForFirestore<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        result[key] = cleanForFirestore(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

export async function saveEmployee(employee: Employee): Promise<Employee> {
  const empRef = doc(db, EMPLOYEES_COLL, employee.id);
  const cleaned = cleanForFirestore(employee);
  await setDoc(empRef, cleaned);
  return employee;
}

export async function batchSaveEmployees(employees: Employee[]): Promise<number> {
  if (employees.length === 0) return 0;
  // Firestore limit is 500 writes per batch. We chunk by 400 safely.
  const BATCH_SIZE = 400;
  for (let i = 0; i < employees.length; i += BATCH_SIZE) {
    const chunk = employees.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    for (const emp of chunk) {
      const empRef = doc(db, EMPLOYEES_COLL, emp.id);
      batch.set(empRef, cleanForFirestore(emp));
    }
    await batch.commit();
  }
  return employees.length;
}

export async function updateEmployeeDoc(employee: Employee): Promise<Employee> {
  const empRef = doc(db, EMPLOYEES_COLL, employee.id);
  const cleaned = cleanForFirestore(employee);
  await setDoc(empRef, cleaned, { merge: true });
  return employee;
}

export async function deleteEmployeeDoc(employeeId: string): Promise<void> {
  const empRef = doc(db, EMPLOYEES_COLL, employeeId);
  await deleteDoc(empRef);

  // Also delete associated leave records
  try {
    const leaveSnap = await getDocs(collection(db, LEAVE_RECORDS_COLL));
    const batch = writeBatch(db);
    let hasBatchDeletes = false;

    leaveSnap.forEach((d) => {
      const data = d.data() as LeaveRecord;
      if (data.employeeId === employeeId) {
        batch.delete(doc(db, LEAVE_RECORDS_COLL, d.id));
        hasBatchDeletes = true;
      }
    });

    if (hasBatchDeletes) {
      await batch.commit();
    }
  } catch (err) {
    console.warn('Could not cascade delete leave records:', err);
  }
}

// ----------------- LEAVE RECORDS -----------------

export async function fetchLeaveRecords(): Promise<LeaveRecord[]> {
  try {
    const snap = await getDocs(collection(db, LEAVE_RECORDS_COLL));
    const list: LeaveRecord[] = [];
    snap.forEach((d) => list.push(d.data() as LeaveRecord));
    return list.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
  } catch (err) {
    console.error('Error fetching leave records from Firestore:', err);
    return [];
  }
}

export async function saveLeaveRecord(record: LeaveRecord): Promise<LeaveRecord> {
  const recRef = doc(db, LEAVE_RECORDS_COLL, record.id);
  await setDoc(recRef, record);
  return record;
}

export async function deleteLeaveRecordDoc(recordId: string): Promise<void> {
  const recRef = doc(db, LEAVE_RECORDS_COLL, recordId);
  await deleteDoc(recRef);
}

// ----------------- USERS -----------------

export async function fetchUsers(): Promise<DbUser[]> {
  try {
    const snap = await getDocs(collection(db, USERS_COLL));
    const list: DbUser[] = [];
    snap.forEach((d) => list.push(d.data() as DbUser));
    
    // Merge any missing default users so that all configured accounts are always available
    const mergedList = [...list];
    const batch = writeBatch(db);
    let hasNewSeeds = false;

    for (const def of DEFAULT_USERS) {
      const exists = mergedList.some(
        (u) => 
          u.uid === def.uid || 
          u.email.toLowerCase() === def.email.toLowerCase() ||
          u.name.toLowerCase().includes(def.uid.replace('local-', '').toLowerCase())
      );
      if (!exists) {
        mergedList.push(def);
        batch.set(doc(db, USERS_COLL, def.uid), def);
        hasNewSeeds = true;
      }
    }

    if (hasNewSeeds) {
      await batch.commit().catch((e) => console.warn('Seeding default users failed:', e));
    }

    return mergedList;
  } catch (err) {
    console.warn('Failed to fetch remote users, returning default users:', err);
    return DEFAULT_USERS;
  }
}

export async function saveUserDoc(user: DbUser): Promise<DbUser> {
  try {
    const userRef = doc(db, USERS_COLL, user.uid);
    await setDoc(userRef, user, { merge: true });
  } catch (err) {
    console.warn('Failed to persist user in Firestore:', err);
  }
  return user;
}

export async function deleteUserDoc(uid: string): Promise<void> {
  const userRef = doc(db, USERS_COLL, uid);
  await deleteDoc(userRef);
}

export async function getOrCreateDbUser(uid: string, email: string, name?: string): Promise<DbUser> {
  try {
    const userRef = doc(db, USERS_COLL, uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data() as DbUser;
    }

    const role = (email && (email.toLowerCase().includes('admin') || email.toLowerCase().includes('itseytam')))
      ? 'ADMIN'
      : 'HR Manager';

    const newUser: DbUser = {
      uid,
      email: email || `${uid}@local.app`,
      name: name || (email ? email.split('@')[0] : 'Utilisateur'),
      role,
      createdAt: new Date().toISOString(),
    };

    await setDoc(userRef, newUser);
    return newUser;
  } catch (err) {
    console.warn('Error in getOrCreateDbUser:', err);
    return {
      uid,
      email: email || 'user@local.app',
      name: name || 'Utilisateur',
      role: 'ADMIN',
      createdAt: new Date().toISOString(),
    };
  }
}

// ----------------- RESET & CLEAR -----------------

export async function resetDemoDataToFirestore(): Promise<void> {
  await clearAllFirestoreData();

  // Save the full set of 142 enterprise HR employee records with documents
  await batchSaveEmployees(INITIAL_HR_EMPLOYEES);

  const batch = writeBatch(db);
  for (const rec of SAMPLE_DEMO_LEAVE_RECORDS) {
    batch.set(doc(db, LEAVE_RECORDS_COLL, rec.id), rec);
  }
  for (const u of DEFAULT_USERS) {
    batch.set(doc(db, USERS_COLL, u.uid), u);
  }
  await batch.commit();
}

export async function clearAllFirestoreData(): Promise<void> {
  try {
    const empSnap = await getDocs(collection(db, EMPLOYEES_COLL));
    const leaveSnap = await getDocs(collection(db, LEAVE_RECORDS_COLL));

    const allDocRefs = [
      ...empSnap.docs.map(d => doc(db, EMPLOYEES_COLL, d.id)),
      ...leaveSnap.docs.map(d => doc(db, LEAVE_RECORDS_COLL, d.id))
    ];

    const BATCH_SIZE = 400;
    for (let i = 0; i < allDocRefs.length; i += BATCH_SIZE) {
      const chunk = allDocRefs.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      for (const ref of chunk) {
        batch.delete(ref);
      }
      await batch.commit();
    }
  } catch (err) {
    console.error('Error clearing data:', err);
  }
}
