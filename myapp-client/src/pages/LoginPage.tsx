import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useBranding } from '../BrandingContext';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [windowsLoading, setWindowsLoading] = useState(false);
  const { user, initializing, login, loginWithWindows } = useAuth();
  const { branding } = useBranding();
  const navigate = useNavigate();

  // Windows/AD kimliğiyle otomatik giriş denemesi sürüyor -> kısa bir bekleme ekranı göster
  if (initializing) {
    return (
      <div className="auth-panel" style={{ minHeight: '100vh' }}>
        <p className="checking-auth">Windows kimliğiniz doğrulanıyor...</p>
      </div>
    );
  }

  // Otomatik giriş başarılı oldu -> formu göstermeden yönlendir
  if (user) {
    return <Navigate to="/tickets" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/tickets');
    } catch (err) {
      setError('E-posta veya şifre hatalı.');
    } finally {
      setLoading(false);
    }
  }

  async function handleWindowsLogin() {
    setError(null);
    setWindowsLoading(true);
    try {
      const success = await loginWithWindows();
      if (success) {
        navigate('/tickets');
      } else {
        setError('Windows kimliği alınamadı. Bu bilgisayar domain\'e bağlı olmayabilir.');
      }
    } finally {
      setWindowsLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      {/* Sol görsel panel */}
      <div className="auth-visual">
        <div className="brand">
          {branding.logoDataUrl ? (
            <img src={branding.logoDataUrl} alt={branding.companyName} className="brand-logo" />
          ) : null}
          <span>{branding.companyName}</span>
          <span className="tag">#IT-DESK</span>
        </div>

        <div className="pitch">
          <h1>Taleplerin nerede olduğunu her zaman bil.</h1>
          <p>
            Açtığın destek talebinin durumunu takip et, bilgi işlem ekibi üstüne alsın ve süreç
            şeffaf ilerlesin.
          </p>
        </div>

        <div className="stub-row">
          <div className="mini-stub">
            <span className="dot" style={{ background: '#d98c2b' }} />
            Açık
          </div>
          <div className="mini-stub">
            <span className="dot" style={{ background: '#5b7cf5' }} />
            İşleme Alındı
          </div>
          <div className="mini-stub">
            <span className="dot" style={{ background: '#3fbf8f' }} />
            Çözüldü
          </div>
          <div className="mini-stub">
            <span className="dot" style={{ background: '#8891a3' }} />
            Kapatıldı
          </div>
        </div>
      </div>

      {/* Sağ form paneli */}
      <div className="auth-panel">
        <div className="auth-card">
          <p className="eyebrow">Hoş geldin</p>
          <h2>Hesabına giriş yap</h2>

          {error && <div className="form-error visible">{error}</div>}

          <button
            type="button"
            className="btn btn-ghost"
            style={{ width: '100%', marginBottom: 18 }}
            onClick={handleWindowsLogin}
            disabled={windowsLoading}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 12a9 9 0 1 0 9-9" />
              <path d="M3 12a9 9 0 0 0 9 9" strokeDasharray="2 3" />
              <path d="M12 3v9l6 3" />
            </svg>
            {windowsLoading ? 'Deneniyor...' : 'Windows ile Giriş Yap'}
          </button>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">E-posta</label>
              <input
                id="email"
                type="email"
                placeholder="ornek@sirket.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">Şifre</label>
              <div className="password-field">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  title={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-10-8-10-8a18.6 18.6 0 0 1 4.22-5.94M9.9 4.24A9.6 9.6 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <path d="M1 1l22 22" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M1 12s3-8 11-8 11 8 11 8-3 8-11 8-11-8-11-8Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>

          <div className="credential-hint">
            Demo hesaplar — Personel: <code>itstaff@example.com</code> / <code>Staff123!</code>
            <br />
            Kullanıcı: <code>demo@example.com</code> / <code>Demo123!</code>
          </div>
        </div>
      </div>
    </div>
  );
}
