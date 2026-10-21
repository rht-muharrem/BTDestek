import { useEffect, useRef, useState } from 'react';
import { notificationsApi } from '../api';
import { AppNotification } from '../types';
import { useRealtime } from '../RealtimeContext';
import { useBranding } from '../BrandingContext';
import { showDesktopNotification } from '../browserNotifications';

function fmtRelative(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'az önce';
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa önce`;
  return new Date(iso).toLocaleDateString('tr-TR');
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { connection } = useRealtime();
  const { branding } = useBranding();

  useEffect(() => {
    load();
    // SignalR bağlıyken sık polling'e gerek yok ama yedek olarak 60 saniyede bir tazeliyoruz
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  // Gerçek zamanlı: backend bir bildirim ürettiği anda burada canlı yakalanır,
  // sayfa yenilenmeden veya polling beklemeden zil güncellenir.
  useEffect(() => {
    if (!connection) return;

    function handleNew(message: string) {
      setNotifications((prev) => [
        { id: -Date.now(), message, ticketId: null, isRead: false, createdAt: new Date().toISOString() },
        ...prev,
      ]);
      setFlash(true);
      setTimeout(() => setFlash(false), 1200);
      showDesktopNotification(branding.companyName, message);
    }

    connection.on('NewNotification', handleNew);
    return () => {
      connection.off('NewNotification', handleNew);
    };
  }, [connection]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function load() {
    try {
      const data = await notificationsApi.getAll();
      setNotifications(data);
    } catch {
      // sessizce yoksay
    }
  }

  async function handleOpen() {
    setOpen((v) => !v);
  }

  async function handleMarkAllRead() {
    await notificationsApi.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  async function handleItemClick(n: AppNotification) {
    if (n.isRead || n.id < 0) return; // negatif id = henüz backend'den senkronize olmamış canlı bildirim
    try {
      await notificationsApi.markRead(n.id);
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    } catch {
      // sessizce yoksay
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="notification-bell" ref={wrapperRef}>
      <button className={`bell-btn${flash ? ' flash' : ''}`} onClick={handleOpen} aria-label="Bildirimler">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && <span className="bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-head">
            <span>Bildirimler</span>
            {unreadCount > 0 && (
              <button className="mark-all-btn" onClick={handleMarkAllRead}>
                Tümünü okundu yap
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="text-muted-sm" style={{ padding: '16px' }}>
              Henüz bildirim yok.
            </p>
          ) : (
            <div className="notification-list">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notification-item${n.isRead ? '' : ' unread'}`}
                  onClick={() => handleItemClick(n)}
                >
                  <p>{n.message}</p>
                  <span className="notification-time">{fmtRelative(n.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
