import { NavLink } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useBranding } from '../BrandingContext';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';
import { DesktopNotificationToggle } from './DesktopNotificationToggle';
import { Avatar } from './Avatar';

export function Sidebar({ mobileOpen = false, onNavigate }: { mobileOpen?: boolean; onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const { branding } = useBranding();

  if (!user) return null;

  const isStaff = user.role === 'ITStaff';

  return (
    <aside className={`sidebar${mobileOpen ? ' mobile-open' : ''}`}>
      <div className="brand">
        {branding.logoDataUrl ? (
          <img src={branding.logoDataUrl} alt={branding.companyName} className="brand-logo" />
        ) : (
          <span className="mark">IT</span>
        )}
        {branding.companyName}
      </div>

      <nav className="nav-group" onClick={onNavigate}>
        <NavLink to="/tickets" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          {isStaff ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-4" />
              <path d="M9 12l2 2 4-4" />
              <path d="M9 3v6h6V3" />
            </svg>
          )}
          {isStaff ? 'Tüm Talepler' : 'Taleplerim'}
        </NavLink>

        {isStaff && (
          <NavLink to="/dashboard" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 3v18h18" />
              <path d="M18 17V9M13 17V5M8 17v-3" />
            </svg>
            Panel
          </NavLink>
        )}

        {isStaff && (
          <NavLink to="/assets" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
            Envanter
          </NavLink>
        )}

        {isStaff && (
          <NavLink to="/admin" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Kullanıcılar
          </NavLink>
        )}

        {isStaff && (
          <NavLink to="/audit" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 12h6M9 16h6M9 8h6" />
              <rect x="4" y="3" width="16" height="18" rx="2" />
            </svg>
            Denetim Kaydı
          </NavLink>
        )}

        <NavLink to="/help" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 2-3 4" />
            <path d="M12 17h.01" />
          </svg>
          Yardım
        </NavLink>
      </nav>

      <div className="sidebar-notification-row">
        <ThemeToggle />
        <DesktopNotificationToggle />
        <NotificationBell />
      </div>

      <div className="sidebar-foot">
        <Avatar name={user.fullName} size={32} />
        <div className="who">
          <div className="name">{user.fullName}</div>
          <div className="role">{isStaff ? 'Bilgi İşlem' : 'Kullanıcı'}</div>
        </div>
        <button title="Çıkış yap" onClick={logout}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
