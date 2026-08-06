import { adminFirestore } from '../lib/firebase-admin.ts';
import type { Employee, LeaveRecord, ActivityLog } from '../types.ts';
import { SAMPLE_DEMO_EMPLOYEES, SAMPLE_DEMO_LEAVE_RECORDS } from '../utils/vacationCalc.ts';

export async function seedIfEmpty() {
  // Production Firestore initialization
}

export async function getAllEmployees(): Promise<Employee[]> {
  try {
    const snapshot = await adminFirestore.collection('employees').get();
    const list: Employee[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as Employee);
    });
    // Sort by name or creation date
    list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return list;
  } catch (error) {
    console.error('Firestore query failed (getAllEmployees):', error);
    throw new Error('Firestore query failed', { cause: error });
  }
}

export async function createEmployee(data: Employee): Promise<Employee> {
  try {
    const employeeData: Employee = {
      ...data,
      id: data.id || `emp-${Date.now()}`,
      createdAt: data.createdAt || new Date().toISOString(),
    };
    await adminFirestore.collection('employees').doc(employeeData.id).set(employeeData);
    return employeeData;
  } catch (error) {
    console.error('Firestore insert failed (createEmployee):', error);
    throw new Error('Firestore insert failed', { cause: error });
  }
}

export async function createEmployeesBatch(dataList: Employee[]): Promise<Employee[]> {
  try {
    if (dataList.length === 0) return [];
    const batch = adminFirestore.batch();
    const insertedRows: Employee[] = [];

    for (const item of dataList) {
      const emp: Employee = {
        ...item,
        id: item.id || `emp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        createdAt: item.createdAt || new Date().toISOString(),
      };
      const docRef = adminFirestore.collection('employees').doc(emp.id);
      batch.set(docRef, emp, { merge: true });
      insertedRows.push(emp);
    }

    await batch.commit();
    return insertedRows;
  } catch (error) {
    console.error('Firestore batch insert failed (createEmployeesBatch):', error);
    throw new Error('Firestore batch insert failed', { cause: error });
  }
}

export async function updateEmployee(id: string, data: Partial<Employee>): Promise<Employee> {
  try {
    const docRef = adminFirestore.collection('employees').doc(id);
    await docRef.set(data, { merge: true });
    const doc = await docRef.get();
    return doc.data() as Employee;
  } catch (error) {
    console.error('Firestore update failed (updateEmployee):', error);
    throw new Error('Firestore update failed', { cause: error });
  }
}

export async function deleteEmployee(id: string): Promise<void> {
  try {
    await adminFirestore.collection('employees').doc(id).delete();
  } catch (error) {
    console.error('Firestore delete failed (deleteEmployee):', error);
    throw new Error('Firestore delete failed', { cause: error });
  }
}

export async function getAllLeaveRecords(): Promise<LeaveRecord[]> {
  try {
    const snapshot = await adminFirestore.collection('leave_records').get();
    const list: LeaveRecord[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as LeaveRecord);
    });
    list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return list;
  } catch (error) {
    console.error('Firestore query failed (getAllLeaveRecords):', error);
    throw new Error('Firestore query failed', { cause: error });
  }
}

export async function createLeaveRecord(data: LeaveRecord): Promise<LeaveRecord> {
  try {
    const leaveData: LeaveRecord = {
      ...data,
      id: data.id || `leave-${Date.now()}`,
      createdAt: data.createdAt || new Date().toISOString(),
    };
    await adminFirestore.collection('leave_records').doc(leaveData.id).set(leaveData);
    return leaveData;
  } catch (error) {
    console.error('Firestore insert failed (createLeaveRecord):', error);
    throw new Error('Firestore insert failed', { cause: error });
  }
}

export async function deleteLeaveRecord(id: string): Promise<void> {
  try {
    await adminFirestore.collection('leave_records').doc(id).delete();
  } catch (error) {
    console.error('Firestore delete failed (deleteLeaveRecord):', error);
    throw new Error('Firestore delete failed', { cause: error });
  }
}

export async function getAllAuditLogs(): Promise<ActivityLog[]> {
  try {
    const snapshot = await adminFirestore.collection('audit_logs').limit(500).get();
    const list: ActivityLog[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as ActivityLog);
    });
    list.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    return list;
  } catch (error) {
    console.error('Firestore query failed (getAllAuditLogs):', error);
    throw new Error('Firestore query failed', { cause: error });
  }
}

export async function createAuditLog(data: ActivityLog): Promise<ActivityLog> {
  try {
    const logData: ActivityLog = {
      ...data,
      id: data.id || `log-${Date.now()}`,
      timestamp: data.timestamp || new Date().toISOString(),
    };
    await adminFirestore.collection('audit_logs').doc(logData.id).set(logData);
    return logData;
  } catch (error) {
    console.error('Firestore insert failed (createAuditLog):', error);
    throw new Error('Firestore insert failed', { cause: error });
  }
}

export async function resetDemoDataInDb() {
  try {
    const batch = adminFirestore.batch();

    // Clear existing
    const leavesSnap = await adminFirestore.collection('leave_records').get();
    leavesSnap.forEach((doc) => batch.delete(doc.ref));

    const empsSnap = await adminFirestore.collection('employees').get();
    empsSnap.forEach((doc) => batch.delete(doc.ref));

    // Add demo data
    for (const emp of SAMPLE_DEMO_EMPLOYEES) {
      const ref = adminFirestore.collection('employees').doc(emp.id);
      batch.set(ref, emp);
    }
    for (const rec of SAMPLE_DEMO_LEAVE_RECORDS) {
      const ref = adminFirestore.collection('leave_records').doc(rec.id);
      batch.set(ref, rec);
    }

    await batch.commit();
  } catch (error) {
    console.error('Failed to reset demo data in Firestore:', error);
  }
}

export async function clearAllDataInDb() {
  try {
    const batch = adminFirestore.batch();
    const leavesSnap = await adminFirestore.collection('leave_records').get();
    leavesSnap.forEach((doc) => batch.delete(doc.ref));

    const empsSnap = await adminFirestore.collection('employees').get();
    empsSnap.forEach((doc) => batch.delete(doc.ref));

    await batch.commit();
  } catch (error) {
    console.error('Failed to clear data in Firestore:', error);
  }
}
