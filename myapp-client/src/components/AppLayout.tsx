import { ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';
import { SessionExpiryWarning } from './SessionExpiryWarning';
import { useBranding } from '../BrandingContext';

export function AppLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { branding } = useBranding();

  return (
    <div className="app-shell">
      {/* Sadece mobilde görünen üst çubuk */}
      <div className="mobile-topbar">
        <button className="hamburger-btn" onClick={() => setMobileOpen(true)} aria-label="Menüyü aç">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
        <span className="mobile-topbar-title">{branding.companyName}</span>
      </div>

      {mobileOpen && <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />}

      <Sidebar mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />

      <main className="main">
        <SessionExpiryWarning />
        {children}
      </main>
    </div>
  );
}
