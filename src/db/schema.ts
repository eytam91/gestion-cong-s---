import { relations } from 'drizzle-orm';
import { boolean, doublePrecision, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  name: text('name'),
  role: text('role').default('HR Manager'),
  password: text('password'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const employees = pgTable('employees', {
  id: text('id').primaryKey(),
  idNumber: text('id_number').notNull().default(''),
  name: text('name').notNull(),
  position: text('position').notNull().default(''),
  status: text('status').notNull().default('LOCAL'),
  hireDate: text('hire_date').notNull(),
  contractType: text('contract_type').notNull().default('TYPE_A'),
  createdAt: text('created_at').notNull(),
});

export const leaveRecords = pgTable('leave_records', {
  id: text('id').primaryKey(),
  employeeId: text('employee_id')
    .references(() => employees.id, { onDelete: 'cascade' })
    .notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  daysCount: doublePrecision('days_count').notNull(),
  leaveType: text('leave_type').notNull(),
  isPaid: boolean('is_paid').notNull().default(true),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  timestamp: text('timestamp').notNull(),
  action: text('action').notNull(),
  actionLabel: text('action_label').notNull(),
  details: text('details').notNull(),
  targetId: text('target_id'),
  deviceId: text('device_id').notNull().default('cloud-device'),
  deviceType: text('device_type').notNull().default('Desktop'),
});

export const employeesRelations = relations(employees, ({ many }) => ({
  leaveRecords: many(leaveRecords),
}));

export const leaveRecordsRelations = relations(leaveRecords, ({ one }) => ({
  employee: one(employees, {
    fields: [leaveRecords.employeeId],
    references: [employees.id],
  }),
}));
