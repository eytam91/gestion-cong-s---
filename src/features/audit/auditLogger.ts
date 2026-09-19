import {
  collection,
  doc,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ActivityLog, AuditActor, DeviceSession } from '@/types';

const DEVICE_ID_KEY = 'app_device_id_v1';
const DEVICE_SESSIONS_KEY = 'app_device_sessions_v1';
const AUDIT_LOGS_COLL = 'audit_logs';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getOrCreateDeviceId(): string {
  let devId = localStorage.getItem(DEVICE_ID_KEY);
  if (!devId) {
    devId = 'dev-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
    localStorage.setItem(DEVICE_ID_KEY, devId);
  }
  return devId;
}

export function getDeviceDetails(): Omit<DeviceSession, 'firstConnectedAt' | 'lastActiveAt'> {
  const deviceId = getOrCreateDeviceId();
  const ua = navigator.userAgent || '';

  let deviceType: DeviceSession['deviceType'] = 'Desktop';
  if (/iPad|tablet|PlayBook|Silk/i.test(ua)) {
    deviceType = 'Tablet';
  } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|NetFront/i.test(ua)) {
    deviceType = 'Mobile';
  } else if (window.innerWidth < 768) {
    deviceType = 'Mobile';
  }

  return {
    deviceId,
    userAgent: ua,
    platform: navigator.platform || 'Navigateur Web',
    screenResolution: `${window.screen?.width || window.innerWidth}x${window.screen?.height || window.innerHeight}`,
    deviceType,
    language: navigator.language || 'fr-FR',
  };
}

/**
 * Device sessions stay in localStorage on purpose: they describe this browser,
 * not the tenant, and are useful before anyone has signed in.
 */
export function registerDeviceConnection(): DeviceSession {
  const info = getDeviceDetails();
  const nowIso = new Date().toISOString();
  const sessions = readJson<DeviceSession[]>(DEVICE_SESSIONS_KEY, []);

  const existingIndex = sessions.findIndex((s) => s.deviceId === info.deviceId);
  let updatedSession: DeviceSession;

  if (existingIndex >= 0) {
    updatedSession = { ...sessions[existingIndex], ...info, lastActiveAt: nowIso };
    sessions[existingIndex] = updatedSession;
  } else {
    updatedSession = { ...info, firstConnectedAt: nowIso, lastActiveAt: nowIso };
    sessions.unshift(updatedSession);
  }

  localStorage.setItem(DEVICE_SESSIONS_KEY, JSON.stringify(sessions));
  return updatedSession;
}

export function getDeviceSessions(): DeviceSession[] {
  return readJson<DeviceSession[]>(DEVICE_SESSIONS_KEY, []);
}

/**
 * Writes one entry to the shared, append-only audit trail. Requires a signed-in
 * actor: firestore.rules rejects a log whose actorUid is not the caller.
 */
export async function addActivityLog(
  logData: {
    action: ActivityLog['action'];
    actionLabel: string;
    details: string;
    targetId?: string;
  },
  actor: AuditActor,
): Promise<ActivityLog> {
  const info = getDeviceDetails();
  const id = 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);

  const entry: ActivityLog = {
    id,
    timestamp: new Date().toISOString(),
    action: logData.action,
    actionLabel: logData.actionLabel,
    details: logData.details,
    actorUid: actor.uid,
    actorName: actor.name,
    deviceId: info.deviceId,
    deviceType: info.deviceType,
    ...(logData.targetId ? { targetId: logData.targetId } : {}),
  };

  await setDoc(doc(db, AUDIT_LOGS_COLL, id), entry);
  return entry;
}

export async function fetchActivityLogs(max = 200): Promise<ActivityLog[]> {
  const snap = await getDocs(
    query(collection(db, AUDIT_LOGS_COLL), orderBy('timestamp', 'desc'), fsLimit(max)),
  );
  return snap.docs.map((d) => d.data() as ActivityLog);
}
