import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch,
  query,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Employee, LeaveRecord, ActivityLog } from '../types';
import { SAMPLE_DEMO_EMPLOYEES, SAMPLE_DEMO_LEAVE_RECORDS } from '../utils/vacationCalc';

const EMPLOYEES_COLL = 'employees';
const LEAVE_RECORDS_COLL = 'leave_records';
const AUDIT_LOGS_COLL = 'audit_logs';
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
  { uid: 'local-admin', email: 'admin@local.app', name: 'Administrateur', role: 'ADMIN', password: 'admin123', createdAt: new Date().toISOString() },
  { uid: 'local-user1', email: 'user1@local.app', name: 'Utilisateur 1 (RH)', role: 'HR Manager', password: 'user123', createdAt: new Date().toISOString() },
  { uid: 'local-user2', email: 'user2@local.app', name: 'Utilisateur 2 (RH)', role: 'HR Manager', password: 'user123', createdAt: new Date().toISOString() },
];

/**
 * Ensures initial collections and default demo data exist in Firestore.
 */
export async function initializeFirestoreData(): Promise<{ employees: Employee[]; leaveRecords: LeaveRecord[] }> {
  try {
    const empSnap = await getDocs(collection(db, EMPLOYEES_COLL));
    
    if (empSnap.empty) {
      console.log('Seeding initial demo employees and leave records to Firestore...');
      const batch = writeBatch(db);

      // Seed employees
      for (const emp of SAMPLE_DEMO_EMPLOYEES) {
        const empRef = doc(db, EMPLOYEES_COLL, emp.id);
        batch.set(empRef, emp);
      }

      // Seed leave records
      for (const rec of SAMPLE_DEMO_LEAVE_RECORDS) {
        const recRef = doc(db, LEAVE_RECORDS_COLL, rec.id);
        batch.set(recRef, rec);
      }

      // Seed default users
      for (const u of DEFAULT_USERS) {
        const userRef = doc(db, USERS_COLL, u.uid);
        batch.set(userRef, u);
      }

      await batch.commit();
      return { employees: SAMPLE_DEMO_EMPLOYEES, leaveRecords: SAMPLE_DEMO_LEAVE_RECORDS };
    }

    const employees: Employee[] = [];
    empSnap.forEach((d) => {
      employees.push(d.data() as Employee);
    });

    const leaveSnap = await getDocs(collection(db, LEAVE_RECORDS_COLL));
    const leaveRecords: LeaveRecord[] = [];
    leaveSnap.forEach((d) => {
      leaveRecords.push(d.data() as LeaveRecord);
    });

    return { employees, leaveRecords };
  } catch (error) {
    console.error('Failed to initialize or fetch Firestore data:', error);
    return { employees: SAMPLE_DEMO_EMPLOYEES, leaveRecords: SAMPLE_DEMO_LEAVE_RECORDS };
  }
}

// ----------------- EMPLOYEES -----------------

export async function fetchEmployees(): Promise<Employee[]> {
  const snap = await getDocs(collection(db, EMPLOYEES_COLL));
  const list: Employee[] = [];
  snap.forEach((d) => list.push(d.data() as Employee));
  // Sort by createdAt desc or name
  return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function saveEmployee(employee: Employee): Promise<Employee> {
  const empRef = doc(db, EMPLOYEES_COLL, employee.id);
  await setDoc(empRef, employee);
  return employee;
}

export async function batchSaveEmployees(employees: Employee[]): Promise<number> {
  const batch = writeBatch(db);
  for (const emp of employees) {
    const empRef = doc(db, EMPLOYEES_COLL, emp.id);
    batch.set(empRef, emp);
  }
  await batch.commit();
  return employees.length;
}

export async function updateEmployeeDoc(employee: Employee): Promise<Employee> {
  const empRef = doc(db, EMPLOYEES_COLL, employee.id);
  await setDoc(empRef, employee, { merge: true });
  return employee;
}

export async function deleteEmployeeDoc(employeeId: string): Promise<void> {
  const empRef = doc(db, EMPLOYEES_COLL, employeeId);
  await deleteDoc(empRef);

  // Also delete associated leave records
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
}

// ----------------- LEAVE RECORDS -----------------

export async function fetchLeaveRecords(): Promise<LeaveRecord[]> {
  const snap = await getDocs(collection(db, LEAVE_RECORDS_COLL));
  const list: LeaveRecord[] = [];
  snap.forEach((d) => list.push(d.data() as LeaveRecord));
  return list.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
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
  const list: DbUser[] = [];
  snap.forEach((d) => list.push(d.data() as DbUser));
  if (list.length === 0) {
    return DEFAULT_USERS;
  }
  return list;
}

export async function saveUserDoc(user: DbUser): Promise<DbUser> {
  const userRef = doc(db, USERS_COLL, user.uid);
  await setDoc(userRef, user, { merge: true });
  return user;
}

export async function deleteUserDoc(uid: string): Promise<void> {
  const userRef = doc(db, USERS_COLL, uid);
  await deleteDoc(userRef);
}

export async function getOrCreateDbUser(uid: string, email: string, name?: string): Promise<DbUser> {
  const userRef = doc(db, USERS_COLL, uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data() as DbUser;
  }

  const role = email.toLowerCase().includes('admin') || email.toLowerCase().includes('itseytam')
    ? 'ADMIN'
    : 'HR Manager';

  const newUser: DbUser = {
    uid,
    email,
    name: name || email.split('@')[0],
    role,
    createdAt: new Date().toISOString(),
  };

  await setDoc(userRef, newUser);
  return newUser;
}

// ----------------- RESET & CLEAR -----------------

export async function resetDemoDataToFirestore(): Promise<void> {
  // Clear existing
  await clearAllFirestoreData();

  // Seed fresh
  const batch = writeBatch(db);
  for (const emp of SAMPLE_DEMO_EMPLOYEES) {
    batch.set(doc(db, EMPLOYEES_COLL, emp.id), emp);
  }
  for (const rec of SAMPLE_DEMO_LEAVE_RECORDS) {
    batch.set(doc(db, LEAVE_RECORDS_COLL, rec.id), rec);
  }
  for (const u of DEFAULT_USERS) {
    batch.set(doc(db, USERS_COLL, u.uid), u);
  }
  await batch.commit();
}

export async function clearAllFirestoreData(): Promise<void> {
  const empSnap = await getDocs(collection(db, EMPLOYEES_COLL));
  const leaveSnap = await getDocs(collection(db, LEAVE_RECORDS_COLL));

  const batch = writeBatch(db);
  empSnap.forEach((d) => batch.delete(doc(db, EMPLOYEES_COLL, d.id)));
  leaveSnap.forEach((d) => batch.delete(doc(db, LEAVE_RECORDS_COLL, d.id)));

  await batch.commit();
}
