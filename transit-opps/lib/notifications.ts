import fs from 'fs';
import path from 'path';

export interface InAppNotification {
  id: string;
  message: string;
  triggerEvent: string;
  createdAt: string;
}

const STORAGE_FILE = path.join(process.cwd(), 'notifications.json');

export function getNotifications(): InAppNotification[] {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const content = fs.readFileSync(STORAGE_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Failed to read notifications.json:', error);
  }
  return [];
}

export function saveNotifications(notifications: InAppNotification[]) {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(notifications, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write notifications.json:', error);
  }
}

export function createNotification(message: string, triggerEvent: string) {
  const notifications = getNotifications();
  const newNotif: InAppNotification = {
    id: Math.random().toString(36).substring(2, 9),
    message,
    triggerEvent,
    createdAt: new Date().toISOString(),
  };
  notifications.unshift(newNotif);
  // Cap at 50
  if (notifications.length > 50) {
    notifications.splice(50);
  }
  saveNotifications(notifications);
  return newNotif;
}

export function clearAllNotifications() {
  saveNotifications([]);
}
