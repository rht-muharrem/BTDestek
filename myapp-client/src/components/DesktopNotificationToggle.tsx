import { useEffect, useState } from 'react';
import {
  getNotificationPreference,
  getPermissionState,
  isNotificationSupported,
  requestNotificationPermission,
  setNotificationPreference,
} from '../browserNotifications';

export function DesktopNotificationToggle() {
  const [enabled, setEnabled] = useState(getNotificationPreference());
  const [denied, setDenied] = useState(getPermissionState() === 'denied');

  useEffect(() => {
    setDenied(getPermissionState() === 'denied');
  }, [enabled]);

  if (!isNotificationSupported()) return null;

  async function handleToggle() {
    if (enabled) {
      setNotificationPreference(false);
      setEnabled(false);
      return;
    }

    const granted = await requestNotificationPermission();
    if (!granted) {
      setDenied(getPermissionState() === 'denied');
      return;
    }
    setNotificationPreference(true);
    setEnabled(true);
  }

  return (
    <button
      className="theme-toggle-btn"
      onClick={handleToggle}
      title={
        denied
          ? 'Tarayıcı bildirimlerine izin verilmemiş — tarayıcı ayarlarından açman gerekiyor'
          : enabled
            ? 'Masaüstü bildirimlerini kapat'
            : 'Sekme arka plandayken masaüstü bildirimi al'
      }
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        {!enabled && <path d="M2 2l20 20" />}
      </svg>
      {denied ? 'Bildirim İzni Yok' : enabled ? 'Masaüstü Bildirimi: Açık' : 'Masaüstü Bildirimi: Kapalı'}
    </button>
  );
}
