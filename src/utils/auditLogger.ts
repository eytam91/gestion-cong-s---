import { ActivityLog, DeviceSession } from '../types';

const DEVICE_ID_KEY = 'app_device_id_v1';
const DEVICE_SESSIONS_KEY = 'app_device_sessions_v1';
const ACTIVITY_LOGS_KEY = 'app_activity_logs_v1';

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
  const ua = navigator.userAgent || '';
  
  let deviceType: 'Desktop' | 'Mobile' | 'Tablet' = 'Desktop';
  if (/iPad|tablet|PlayBook|Silk/i.test(ua)) {
    deviceType = 'Tablet';
  } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|NetFront|Silk-Accelerated/i.test(ua)) {
    deviceType = 'Mobile';
  } else if (window.innerWidth < 768) {
    deviceType = 'Mobile';
  }

  const screenResolution = `${window.screen?.width || window.innerWidth}x${window.screen?.height || window.innerHeight}`;
  const platform = navigator.platform || (navigator as any).userAgentData?.platform || 'Navigateur Web';
  const language = navigator.language || 'fr-FR';

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
    
    // Log initial device connection event
    addActivityLog({
      action: 'DEVICE_CONNECTED',
      actionLabel: 'Nouveau Connexion Appareil',
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

// Activity Logging Functions
export function getActivityLogs(): ActivityLog[] {
  try {
    const raw = localStorage.getItem(ACTIVITY_LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function addActivityLog(logData: {
  action: ActivityLog['action'];
  actionLabel: string;
  details: string;
  targetId?: string;
}): ActivityLog {
  const info = getDeviceDetails();
  const newLog: ActivityLog = {
    id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
    action: logData.action,
    actionLabel: logData.actionLabel,
    details: logData.details,
    targetId: logData.targetId,
    deviceId: info.deviceId,
    deviceType: info.deviceType,
  };

  const currentLogs = getActivityLogs();
  const updated = [newLog, ...currentLogs].slice(0, 500); // keep max 500 logs
  localStorage.setItem(ACTIVITY_LOGS_KEY, JSON.stringify(updated));
  return newLog;
}

export function clearAuditLogs(): void {
  localStorage.removeItem(ACTIVITY_LOGS_KEY);
}
