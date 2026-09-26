import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  writeBatch,
  WriteBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Employee, LeaveRecord, DbUser, UserRole } from '../types';
import { INITIAL_HR_EMPLOYEES } from '../data/hrEmployeesData';
import { SAMPLE_DEMO_LEAVE_RECORDS } from '../utils/vacationCalc';

export { type DbUser, type UserRole };

const EMPLOYEES_COLL = 'employees';
const LEAVE_RECORDS_COLL = 'leave_records';
const USERS_COLL = 'users';

/**
 * Executes Firestore batch operations in safe chunks of 400 (well within the 500 operations limit)
 */
export async function commitInChunks(
  operations: ((batch: WriteBatch) => void)[],
  chunkSize: number = 400
): Promise<void> {
  for (let i = 0; i < operations.length; i += chunkSize) {
    const chunk = operations.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const op of chunk) {
      op(batch);
    }
    await batch.commit();
  }
}

/**
 * Helper to remove undefined fields recursively so Firestore doesn't reject data
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

// ----------------- BULK FETCH (NO DEMO SEEDING) -----------------

/**
 * Fetches all master HR data (employees and leave records) directly from Firestore.
 * Does NOT auto-seed dummy or demo data.
 */
export async function fetchAllData(): Promise<{ employees: Employee[]; leaveRecords: LeaveRecord[] }> {
  try {
    const [employees, leaveRecords] = await Promise.all([
      fetchEmployees(),
      fetchLeaveRecords()
    ]);
    return { employees, leaveRecords };
  } catch (error) {
    console.error('Failed to fetch all data from Firestore:', error);
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

export async function saveEmployee(employee: Employee): Promise<Employee> {
  const empRef = doc(db, EMPLOYEES_COLL, employee.id);
  const cleaned = cleanForFirestore(employee);
  await setDoc(empRef, cleaned);
  return employee;
}

export async function batchSaveEmployees(employees: Employee[]): Promise<number> {
  if (employees.length === 0) return 0;
  const operations: ((batch: WriteBatch) => void)[] = employees.map((emp) => (batch) => {
    const empRef = doc(db, EMPLOYEES_COLL, emp.id);
    batch.set(empRef, cleanForFirestore(emp));
  });
  await commitInChunks(operations);
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

  // Cascade delete associated leave records
  try {
    const leaveSnap = await getDocs(collection(db, LEAVE_RECORDS_COLL));
    const deleteOps: ((batch: WriteBatch) => void)[] = [];

    leaveSnap.forEach((d) => {
      const data = d.data() as LeaveRecord;
      if (data.employeeId === employeeId) {
        deleteOps.push((batch) => batch.delete(doc(db, LEAVE_RECORDS_COLL, d.id)));
      }
    });

    if (deleteOps.length > 0) {
      await commitInChunks(deleteOps);
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
  await setDoc(recRef, cleanForFirestore(record));
  return record;
}

export async function deleteLeaveRecordDoc(recordId: string): Promise<void> {
  const recRef = doc(db, LEAVE_RECORDS_COLL, recordId);
  await deleteDoc(recRef);
}

// ----------------- USERS & ROLE MANAGEMENT -----------------

export async function fetchUsers(): Promise<DbUser[]> {
  try {
    const snap = await getDocs(collection(db, USERS_COLL));
    const list: DbUser[] = [];
    snap.forEach((d) => list.push(d.data() as DbUser));
    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  } catch (err) {
    console.warn('Failed to fetch users from Firestore:', err);
    return [];
  }
}

export async function saveUserDoc(user: DbUser): Promise<DbUser> {
  try {
    const userRef = doc(db, USERS_COLL, user.uid);
    await setDoc(userRef, cleanForFirestore(user), { merge: true });
  } catch (err) {
    console.warn('Failed to persist user in Firestore:', err);
  }
  return user;
}

export async function setUserRole(uid: string, role: UserRole, approverUid?: string): Promise<void> {
  const userRef = doc(db, USERS_COLL, uid);
  await setDoc(
    userRef, 
    cleanForFirestore({
      role,
      approvedAt: new Date().toISOString(),
      ...(approverUid ? { approvedBy: approverUid } : {})
    }), 
    { merge: true }
  );
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

    // Determine initial role:
    // If no users exist in the database, promote the very first user to ADMIN.
    // Also if email is known admin email (itseytam@gmail.com or contains 'admin'), assign ADMIN.
    // Otherwise, assign 'PENDING' awaiting approval.
    let initialRole: UserRole = 'PENDING';
    const allUsersSnap = await getDocs(collection(db, USERS_COLL));
    const isFirstUser = allUsersSnap.empty;
    const isExplicitAdminEmail = Boolean(
      email && (
        email.toLowerCase() === 'itseytam@gmail.com' ||
        email.toLowerCase().startsWith('admin@') ||
        email.toLowerCase() === 'admin@local.app'
      )
    );

    if (isFirstUser || isExplicitAdminEmail) {
      initialRole = 'ADMIN';
    }

    const newUser: DbUser = {
      uid,
      email: email || `${uid}@local.app`,
      name: name || (email ? email.split('@')[0] : 'Collaborateur'),
      role: initialRole,
      createdAt: new Date().toISOString(),
    };

    await setDoc(userRef, cleanForFirestore(newUser));
    return newUser;
  } catch (err) {
    console.warn('Error in getOrCreateDbUser:', err);
    return {
      uid,
      email: email || 'user@local.app',
      name: name || 'Collaborateur',
      role: 'PENDING',
      createdAt: new Date().toISOString(),
    };
  }
}

// ----------------- ADMIN TOOLS: RESET & CLEAR -----------------

export async function resetDemoDataToFirestore(): Promise<void> {
  await clearAllFirestoreData();

  // Save the full set of enterprise HR employee records with documents
  await batchSaveEmployees(INITIAL_HR_EMPLOYEES);

  const operations: ((batch: WriteBatch) => void)[] = SAMPLE_DEMO_LEAVE_RECORDS.map((rec) => (batch) => {
    batch.set(doc(db, LEAVE_RECORDS_COLL, rec.id), cleanForFirestore(rec));
  });
  await commitInChunks(operations);
}

export async function clearAllFirestoreData(): Promise<void> {
  try {
    const empSnap = await getDocs(collection(db, EMPLOYEES_COLL));
    const leaveSnap = await getDocs(collection(db, LEAVE_RECORDS_COLL));

    const allDocRefs = [
      ...empSnap.docs.map(d => doc(db, EMPLOYEES_COLL, d.id)),
      ...leaveSnap.docs.map(d => doc(db, LEAVE_RECORDS_COLL, d.id))
    ];

    const operations: ((batch: WriteBatch) => void)[] = allDocRefs.map((ref) => (batch) => {
      batch.delete(ref);
    });

    await commitInChunks(operations);
  } catch (err) {
    console.error('Error clearing data:', err);
  }
}
