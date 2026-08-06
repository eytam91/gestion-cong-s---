import { db } from './index.ts';
import { employees, leaveRecords, auditLogs } from './schema.ts';
import { eq, desc } from 'drizzle-orm';
import type { Employee, LeaveRecord, ActivityLog } from '../types.ts';
import { SAMPLE_DEMO_EMPLOYEES, SAMPLE_DEMO_LEAVE_RECORDS } from '../utils/vacationCalc.ts';

export async function seedIfEmpty() {
  // Do not auto-seed fake demo data in production so the database stays completely clean
}

export async function getAllEmployees(): Promise<Employee[]> {
  try {
    const rows = await db.select().from(employees);
    return rows as Employee[];
  } catch (error) {
    console.error('Database query failed (getAllEmployees):', error);
    throw new Error('Database query failed', { cause: error });
  }
}

export async function createEmployee(data: Employee): Promise<Employee> {
  try {
    const [inserted] = await db.insert(employees).values(data).returning();
    return inserted as Employee;
  } catch (error) {
    console.error('Database insert failed (createEmployee):', error);
    throw new Error('Database insert failed', { cause: error });
  }
}

export async function createEmployeesBatch(dataList: Employee[]): Promise<Employee[]> {
  try {
    if (dataList.length === 0) return [];
    const insertedRows: Employee[] = [];
    for (const item of dataList) {
      const [inserted] = await db.insert(employees).values(item).onConflictDoUpdate({
        target: employees.id,
        set: {
          idNumber: item.idNumber,
          name: item.name,
          position: item.position,
          status: item.status,
          hireDate: item.hireDate,
          contractType: item.contractType,
        }
      }).returning();
      insertedRows.push(inserted as Employee);
    }
    return insertedRows;
  } catch (error) {
    console.error('Database batch insert failed (createEmployeesBatch):', error);
    throw new Error('Database batch insert failed', { cause: error });
  }
}

export async function updateEmployee(id: string, data: Partial<Employee>): Promise<Employee> {
  try {
    const [updated] = await db
      .update(employees)
      .set(data)
      .where(eq(employees.id, id))
      .returning();
    return updated as Employee;
  } catch (error) {
    console.error('Database update failed (updateEmployee):', error);
    throw new Error('Database update failed', { cause: error });
  }
}

export async function deleteEmployee(id: string): Promise<void> {
  try {
    await db.delete(employees).where(eq(employees.id, id));
  } catch (error) {
    console.error('Database delete failed (deleteEmployee):', error);
    throw new Error('Database delete failed', { cause: error });
  }
}

export async function getAllLeaveRecords(): Promise<LeaveRecord[]> {
  try {
    const rows = await db.select().from(leaveRecords);
    return rows as LeaveRecord[];
  } catch (error) {
    console.error('Database query failed (getAllLeaveRecords):', error);
    throw new Error('Database query failed', { cause: error });
  }
}

export async function createLeaveRecord(data: LeaveRecord): Promise<LeaveRecord> {
  try {
    const [inserted] = await db.insert(leaveRecords).values(data).returning();
    return inserted as LeaveRecord;
  } catch (error) {
    console.error('Database insert failed (createLeaveRecord):', error);
    throw new Error('Database insert failed', { cause: error });
  }
}

export async function deleteLeaveRecord(id: string): Promise<void> {
  try {
    await db.delete(leaveRecords).where(eq(leaveRecords.id, id));
  } catch (error) {
    console.error('Database delete failed (deleteLeaveRecord):', error);
    throw new Error('Database delete failed', { cause: error });
  }
}

export async function getAllAuditLogs(): Promise<ActivityLog[]> {
  try {
    const rows = await db.select().from(auditLogs).orderBy(desc(auditLogs.timestamp));
    return rows as ActivityLog[];
  } catch (error) {
    console.error('Database query failed (getAllAuditLogs):', error);
    throw new Error('Database query failed', { cause: error });
  }
}

export async function createAuditLog(data: ActivityLog): Promise<ActivityLog> {
  try {
    const [inserted] = await db.insert(auditLogs).values(data).returning();
    return inserted as ActivityLog;
  } catch (error) {
    console.error('Database insert failed (createAuditLog):', error);
    throw new Error('Database insert failed', { cause: error });
  }
}

export async function resetDemoDataInDb() {
  try {
    await db.delete(leaveRecords);
    await db.delete(employees);
    for (const emp of SAMPLE_DEMO_EMPLOYEES) {
      await db.insert(employees).values(emp);
    }
    for (const rec of SAMPLE_DEMO_LEAVE_RECORDS) {
      await db.insert(leaveRecords).values(rec);
    }
  } catch (error) {
    console.error('Failed to reset demo data in Cloud SQL:', error);
  }
}

export async function clearAllDataInDb() {
  try {
    await db.delete(leaveRecords);
    await db.delete(employees);
  } catch (error) {
    console.error('Failed to clear data in Cloud SQL:', error);
  }
}
