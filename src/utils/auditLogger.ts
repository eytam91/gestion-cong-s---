import { ActivityLog, DeviceSession, AuditActor, UserRole } from '../types';
import { doc, setDoc, getDocs, collection, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';

export { type AuditActor };

const DEVICE_ID_KEY = 'app_device_id_v1';
const DEVICE_SESSIONS_KEY = 'app_device_sessions_v1';
const AUDIT_LOGS_COLL = 'audit_logs';

// Generate or retrieve persistent device unique identifier
export function getOrCreateDeviceId(): string {
  let devId = localStorage.getItem(DEVICE_ID_KEY);
  if (!devId) {
    devId = 'dev-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
    localStorage.setItem(DEVICE_ID_KEY, devId);
  }
  return devId;
}

// Get device information from browser APIs
export function getDeviceDetails(): Omit<DeviceSession, 'firstConnectedAt' | 'lastActiveAt'> {
  const deviceId = getOrCreateDeviceId();
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  
  let deviceType: 'Desktop' | 'Mobile' | 'Tablet' = 'Desktop';
  if (/iPad|tablet|PlayBook|Silk/i.test(ua)) {
    deviceType = 'Tablet';
  } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|NetFront|Silk-Accelerated/i.test(ua)) {
    deviceType = 'Mobile';
  } else if (typeof window !== 'undefined' && window.innerWidth < 768) {
    deviceType = 'Mobile';
  }

  const screenResolution = typeof window !== 'undefined'
    ? `${window.screen?.width || window.innerWidth}x${window.screen?.height || window.innerHeight}`
    : '1920x1080';
  const platform = typeof navigator !== 'undefined'
    ? (navigator.platform || (navigator as any).userAgentData?.platform || 'Navigateur Web')
    : 'Navigateur Web';
  const language = typeof navigator !== 'undefined' ? (navigator.language || 'fr-FR') : 'fr-FR';

  return {
    deviceId,
    userAgent: ua,
    platform,
    screenResolution,
    deviceType,
    language,
  };
}

// Record device session connection
export function registerDeviceConnection(): DeviceSession {
  const info = getDeviceDetails();
  const nowIso = new Date().toISOString();

  let sessions: DeviceSession[] = [];
  try {
    const raw = localStorage.getItem(DEVICE_SESSIONS_KEY);
    if (raw) sessions = JSON.parse(raw);
  } catch (e) {
    console.error('Error parsing device sessions', e);
  }

  const existingIndex = sessions.findIndex((s) => s.deviceId === info.deviceId);
  let updatedSession: DeviceSession;

  if (existingIndex >= 0) {
    updatedSession = {
      ...sessions[existingIndex],
      ...info,
      lastActiveAt: nowIso,
    };
    sessions[existingIndex] = updatedSession;
  } else {
    updatedSession = {
      ...info,
      firstConnectedAt: nowIso,
      lastActiveAt: nowIso,
    };
    sessions.unshift(updatedSession);
    
    // Non-blocking log initial device connection event
    addActivityLog({
      action: 'DEVICE_CONNECTED',
      actionLabel: 'Nouvelle Connexion Appareil',
      details: `Appareil ${info.deviceType} (${info.platform}) avec la résolution ${info.screenResolution}`,
    });
  }

  localStorage.setItem(DEVICE_SESSIONS_KEY, JSON.stringify(sessions));
  return updatedSession;
}

export function getDeviceSessions(): DeviceSession[] {
  try {
    const raw = localStorage.getItem(DEVICE_SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Asynchronously persists an audit log to Firestore (non-blocking, non-fatal).
 * Any Firestore write error is caught and warned without breaking user flow.
 */
export function addActivityLog(logData: {
  action: ActivityLog['action'];
  actionLabel: string;
  details: string;
  targetId?: string;
  actor?: AuditActor;
  actorUid?: string;
  actorName?: string;
  actorEmail?: string;
  actorRole?: UserRole | string;
}): ActivityLog {
  const info = getDeviceDetails();
  
  // Extract or build actor info
  let actorUid = logData.actor?.uid || logData.actorUid;
  let actorName = logData.actor?.name || logData.actorName;
  let actorEmail = logData.actor?.email || logData.actorEmail;
  let actorRole = logData.actor?.role || logData.actorRole;

  if (!actorName) {
    try {
      const savedUser = localStorage.getItem('local_db_user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        actorUid = actorUid || u.uid;
        actorName = actorName || u.name || u.email;
        actorEmail = actorEmail || u.email;
        actorRole = actorRole || u.role;
      }
    } catch {
      // ignore
    }
  }

  const actor: AuditActor = {
    uid: actorUid || 'system',
    name: actorName || 'Utilisateur RH',
    email: actorEmail,
    role: (actorRole as UserRole) || 'HR Manager',
  };

  const newLog: ActivityLog = {
    id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
    action: logData.action,
    actionLabel: logData.actionLabel,
    details: logData.details,
    targetId: logData.targetId,
    deviceId: info.deviceId,
    deviceType: info.deviceType,
    actor,
    actorUid: actor.uid,
    actorName: actor.name,
    actorEmail: actor.email,
    actorRole: actor.role,
  };

  // Asynchronously dispatch to Firestore without blocking user interaction
  try {
    const logRef = doc(db, AUDIT_LOGS_COLL, newLog.id);
    setDoc(logRef, newLog).catch((err) => {
      // Non-fatal logging failure
      console.warn('Audit log write to Firestore failed (non-fatal):', err);
    });
  } catch (err) {
    console.warn('Could not dispatch Firestore audit log (non-fatal):', err);
  }

  return newLog;
}

/**
 * Retrieves audit logs from Cloud Firestore `audit_logs` collection.
 */
export async function fetchActivityLogs(maxCount: number = 200): Promise<ActivityLog[]> {
  try {
    const logsRef = collection(db, AUDIT_LOGS_COLL);
    const q = query(logsRef, orderBy('timestamp', 'desc'), limit(maxCount));
    const snap = await getDocs(q);
    const logs: ActivityLog[] = [];
    snap.forEach((d) => logs.push(d.data() as ActivityLog));
    return logs;
  } catch (err) {
    console.warn('Failed to fetch activity logs from Firestore:', err);
    return [];
  }
}

// Backward-compatible aliases
export const fetchCloudAuditLogs = fetchActivityLogs;
export function getActivityLogs(): ActivityLog[] {
  return [];
}
export function clearAuditLogs(): void {
  // Audit logs in Firestore are immutable per security rules
  console.info('Audit logs in Firestore are immutable.');
}
