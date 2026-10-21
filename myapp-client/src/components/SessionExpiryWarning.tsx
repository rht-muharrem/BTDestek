import { useState } from 'react';
import { useAuth } from '../AuthContext';

export function SessionExpiryWarning() {
  const { sessionExpiringSoon, dismissSessionWarning, loginWithWindows, logout } = useAuth();
  const [renewing, setRenewing] = useState(false);

  if (!sessionExpiringSoon) return null;

  async function handleRenew() {
    setRenewing(true);
    const ok = await loginWithWindows();
    setRenewing(false);
    if (ok) dismissSessionWarning();
  }

  return (
    <div className="session-warning-banner">
      <span>
        ⚠️ Oturumun birazdan sona erecek. Değişikliklerini kaydettiğinden emin ol.
      </span>
      <div className="session-warning-actions">
        <button className="btn btn-ghost btn-sm" onClick={handleRenew} disabled={renewing}>
          {renewing ? 'Deneniyor...' : 'Oturumu Yenile'}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={logout}>
          Çıkış Yap
        </button>
      </div>
    </div>
  );
}
