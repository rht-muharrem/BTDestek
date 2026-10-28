const STORAGE_KEY = 'desktopNotifications';

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPreference(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

export function setNotificationPreference(enabled: boolean) {
  localStorage.setItem(STORAGE_KEY, String(enabled));
}

export function getPermissionState(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function showDesktopNotification(title: string, body: string, onClick?: () => void) {
  if (!getNotificationPreference()) return;
  if (!isNotificationSupported() || Notification.permission !== 'granted') return;
  if (!document.hidden) return;

  const notification = new Notification(title, {
    body,
    icon: '/vite.svg',
    tag: 'destek-masasi',
  });

  notification.onclick = () => {
    window.focus();
    onClick?.();
    notification.close();
  };
}
