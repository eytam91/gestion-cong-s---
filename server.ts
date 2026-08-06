import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser } from './src/db/users.ts';
import {
  getAllEmployees,
  createEmployee,
  createEmployeesBatch,
  updateEmployee,
  deleteEmployee,
  getAllLeaveRecords,
  createLeaveRecord,
  deleteLeaveRecord,
  getAllAuditLogs,
  createAuditLog,
  resetDemoDataInDb,
  clearAllDataInDb,
} from './src/db/queries.ts';
import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';

async function seedUsers() {
  const defaultUsers = [
    { username: 'admin', role: 'ADMIN', name: 'Administrateur', pass: 'admin123' },
    { username: 'user1', role: 'HR Manager', name: 'Utilisateur 1', pass: 'user123' },
    { username: 'user2', role: 'HR Manager', name: 'Utilisateur 2', pass: 'user123' },
    { username: 'user3', role: 'HR Manager', name: 'Utilisateur 3', pass: 'user123' },
    { username: 'user4', role: 'HR Manager', name: 'Utilisateur 4', pass: 'user123' },
  ];

  for (const u of defaultUsers) {
    const email = `${u.username}@local.app`;
    try {
      const existingDbUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
      const uid = `local-${u.username}`;
      
      if (existingDbUser.length === 0) {
        await db.insert(users).values({
          uid,
          email,
          name: u.name,
          role: u.role,
          password: u.pass,
        });
        console.log(`Created DB user ${u.username}`);
      } else if (existingDbUser[0].password !== u.pass) {
        await db.update(users).set({ password: u.pass }).where(eq(users.email, email));
        console.log(`Updated DB user password for ${u.username}`);
      }
    } catch (error) {
      console.error(`Failed to seed user ${u.username}`, error);
    }
  }
}

async function startServer() {
  await seedUsers();
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: 'Cloud SQL (PostgreSQL)' });
  });

  // User Auth Sync route
  app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const dbUser = await getOrCreateUser(req.user.uid, req.user.email || '', req.user.name);
      res.json(dbUser);
    } catch (error: any) {
      console.error('Error syncing auth user:', error);
      res.status(500).json({ error: error.message || 'Failed to sync user' });
    }
  });

  // User Custom Login route
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
      
      if (existingUser.length === 0 || existingUser[0].password !== password) {
        return res.status(401).json({ error: 'Identifiants incorrects.' });
      }
      
      const customToken = jwt.sign({ uid: existingUser[0].uid, email: existingUser[0].email, name: existingUser[0].name, role: existingUser[0].role }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token: customToken, user: existingUser[0] });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to login' });
    }
  });

  // Users API (Admin only)
  app.get('/api/users', requireAuth, async (req: AuthRequest, res) => {
    try {
      const allUsers = await db.select().from(users);
      res.json(allUsers);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch users' });
    }
  });

  app.post('/api/users', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { username, name, role, pass } = req.body;
      const email = `${username.toLowerCase().trim()}@local.app`;
      const uid = `local-${username.toLowerCase().trim()}`;
      
      const newDbUser = await db.insert(users).values({
        uid,
        email,
        name,
        role: role || 'HR Manager',
        password: pass,
      }).returning();

      res.status(201).json(newDbUser[0]);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to create user' });
    }
  });

  app.delete('/api/users/:uid', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.params.uid;
      await db.delete(users).where(eq(users.uid, uid));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to delete user' });
    }
  });

  // Employees API
  app.get('/api/employees', async (req, res) => {
    try {
      const data = await getAllEmployees();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch employees' });
    }
  });

  app.post('/api/employees', async (req, res) => {
    try {
      const newEmp = await createEmployee(req.body);
      res.status(201).json(newEmp);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to create employee' });
    }
  });

  app.post('/api/employees/batch', async (req, res) => {
    try {
      const employeesList = req.body;
      if (!Array.isArray(employeesList)) {
        return res.status(400).json({ error: 'Expected an array of employees' });
      }
      const saved = await createEmployeesBatch(employeesList);
      res.status(201).json(saved);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to batch import employees' });
    }
  });

  app.patch('/api/employees/:id', async (req, res) => {
    try {
      const updated = await updateEmployee(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to update employee' });
    }
  });

  app.delete('/api/employees/:id', async (req, res) => {
    try {
      await deleteEmployee(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to delete employee' });
    }
  });

  // Leave Records API
  app.get('/api/leave-records', async (req, res) => {
    try {
      const data = await getAllLeaveRecords();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch leave records' });
    }
  });

  app.post('/api/leave-records', async (req, res) => {
    try {
      const newLeave = await createLeaveRecord(req.body);
      res.status(201).json(newLeave);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to create leave record' });
    }
  });

  app.delete('/api/leave-records/:id', async (req, res) => {
    try {
      await deleteLeaveRecord(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to delete leave record' });
    }
  });

  // Audit Logs API
  app.get('/api/audit-logs', async (req, res) => {
    try {
      const data = await getAllAuditLogs();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch audit logs' });
    }
  });

  app.post('/api/audit-logs', async (req, res) => {
    try {
      const newLog = await createAuditLog(req.body);
      res.status(201).json(newLog);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to create audit log' });
    }
  });

  // Reset/Clear Data
  app.post('/api/reset-demo', async (req, res) => {
    try {
      await resetDemoDataInDb();
      res.json({ status: 'ok' });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to reset demo data' });
    }
  });

  app.post('/api/clear-data', async (req, res) => {
    try {
      await clearAllDataInDb();
      res.json({ status: 'ok' });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to clear data' });
    }
  });

  // Vite Dev Server / Static Serve
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
