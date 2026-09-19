import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Employee, LeaveRecord } from '@/types';

const EMPLOYEES_COLL = 'employees';
const LEAVE_RECORDS_COLL = 'leave_records';
const USERS_COLL = 'users';

/** PENDING accounts have signed up but not yet been granted access by an admin. */
export type UserRole = 'ADMIN' | 'HR Manager' | 'PENDING';

export interface DbUser {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

// Firestore rejects a batch larger than this.
const MAX_BATCH_OPS = 500;

async function commitInChunks<T>(
  items: T[],
  apply: (batch: ReturnType<typeof writeBatch>, item: T) => void,
): Promise<number> {
  for (let i = 0; i < items.length; i += MAX_BATCH_OPS) {
    const batch = writeBatch(db);
    for (const item of items.slice(i, i + MAX_BATCH_OPS)) {
      apply(batch, item);
    }
    await batch.commit();
  }
  return items.length;
}

// ----------------- EMPLOYEES -----------------

export async function fetchEmployees(): Promise<Employee[]> {
  const snap = await getDocs(collection(db, EMPLOYEES_COLL));
  const list = snap.docs.map((d) => d.data() as Employee);
  return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function saveEmployee(employee: Employee): Promise<Employee> {
  await setDoc(doc(db, EMPLOYEES_COLL, employee.id), employee);
  return employee;
}

export async function batchSaveEmployees(employees: Employee[]): Promise<number> {
  return commitInChunks(employees, (batch, emp) => batch.set(doc(db, EMPLOYEES_COLL, emp.id), emp));
}

export async function updateEmployeeDoc(employee: Employee): Promise<Employee> {
  await setDoc(doc(db, EMPLOYEES_COLL, employee.id), employee, { merge: true });
  return employee;
}

export async function deleteEmployeeDoc(employeeId: string): Promise<void> {
  const ownedLeave = await getDocs(
    query(collection(db, LEAVE_RECORDS_COLL), where('employeeId', '==', employeeId)),
  );

  // Cascade first: an employee deleted while their leave survives leaves orphan
  // records that still count against reporting totals.
  await commitInChunks(ownedLeave.docs, (batch, d) =>
    batch.delete(doc(db, LEAVE_RECORDS_COLL, d.id)),
  );

  await deleteDoc(doc(db, EMPLOYEES_COLL, employeeId));
}

// ----------------- LEAVE RECORDS -----------------

export async function fetchLeaveRecords(): Promise<LeaveRecord[]> {
  const snap = await getDocs(collection(db, LEAVE_RECORDS_COLL));
  const list = snap.docs.map((d) => d.data() as LeaveRecord);
  return list.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
}

export async function saveLeaveRecord(record: LeaveRecord): Promise<LeaveRecord> {
  await setDoc(doc(db, LEAVE_RECORDS_COLL, record.id), record);
  return record;
}

export async function deleteLeaveRecordDoc(recordId: string): Promise<void> {
  await deleteDoc(doc(db, LEAVE_RECORDS_COLL, recordId));
}

export async function fetchAllData(): Promise<{
  employees: Employee[];
  leaveRecords: LeaveRecord[];
}> {
  const [employees, leaveRecords] = await Promise.all([fetchEmployees(), fetchLeaveRecords()]);
  return { employees, leaveRecords };
}

// ----------------- USERS -----------------

export async function fetchUsers(): Promise<DbUser[]> {
  const snap = await getDocs(collection(db, USERS_COLL));
  return snap.docs
    .map((d) => d.data() as DbUser)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

export async function getUserProfile(uid: string): Promise<DbUser | null> {
  const snap = await getDoc(doc(db, USERS_COLL, uid));
  return snap.exists() ? (snap.data() as DbUser) : null;
}

/**
 * Creates the Firestore profile for a freshly registered account. The role is
 * fixed to PENDING here and in firestore.rules: access is granted by an existing
 * admin, never claimed at sign-up.
 */
export async function createUserProfile(uid: string, email: string, name: string): Promise<DbUser> {
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

export async function deleteUserDoc(uid: string): Promise<void> {
  await deleteDoc(doc(db, USERS_COLL, uid));
}

// ----------------- BULK MAINTENANCE -----------------

/**
 * Deletes every employee and leave record. Destructive and admin-only; the UI
 * must confirm before calling it.
 */
export async function clearAllFirestoreData(): Promise<void> {
  const [empSnap, leaveSnap] = await Promise.all([
    getDocs(collection(db, EMPLOYEES_COLL)),
    getDocs(collection(db, LEAVE_RECORDS_COLL)),
  ]);

  await commitInChunks(leaveSnap.docs, (batch, d) =>
    batch.delete(doc(db, LEAVE_RECORDS_COLL, d.id)),
  );
  await commitInChunks(empSnap.docs, (batch, d) => batch.delete(doc(db, EMPLOYEES_COLL, d.id)));
}
