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

/** PENDING accounts have registered but not yet been granted access by an admin. */
export type UserRole = 'ADMIN' | 'HR Manager' | 'PENDING';

export interface DbUser {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

/**
 * Loads the HR data for a signed-in staff member, seeding the employee roster on
 * first run if the collection is empty.
 *
 * User accounts are no longer seeded here: they are real Firebase Auth accounts,
 * and their roles are granted by an admin rather than shipped in the bundle.
 */
export async function initializeFirestoreData(): Promise<{ employees: Employee[]; leaveRecords: LeaveRecord[] }> {
  try {
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
  const snap = await getDocs(collection(db, USERS_COLL));
  return snap.docs
    .map((d) => d.data() as DbUser)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

export async function deleteUserDoc(uid: string): Promise<void> {
  const userRef = doc(db, USERS_COLL, uid);
  await deleteDoc(userRef);
}

export async function getUserProfile(uid: string): Promise<DbUser | null> {
  const snap = await getDoc(doc(db, USERS_COLL, uid));
  return snap.exists() ? (snap.data() as DbUser) : null;
}

/**
 * Creates the profile for a freshly registered account.
 *
 * The role is fixed to PENDING here and in firestore.rules. It is deliberately
 * not derived from the email address: a rule like "contains 'admin'" would let
 * anyone grant themselves admin just by choosing their username.
 */
export async function createUserProfile(
  uid: string,
  email: string,
  name: string,
): Promise<DbUser> {
  const profile: DbUser = {
    uid,
    email,
    name: name || email.split('@')[0],
    role: 'PENDING',
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, USERS_COLL, uid), profile);
  return profile;
}

export async function setUserRole(uid: string, role: UserRole): Promise<void> {
  await setDoc(doc(db, USERS_COLL, uid), { role }, { merge: true });
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
