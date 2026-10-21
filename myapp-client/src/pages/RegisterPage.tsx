import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useBranding } from '../BrandingContext';

export function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { branding } = useBranding();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(fullName, email, password);
      navigate('/tickets');
    } catch (err) {
      setError('Kayıt oluşturulamadı. E-posta zaten kullanılıyor olabilir.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-visual">
        <div className="brand">
          {branding.logoDataUrl ? (
            <img src={branding.logoDataUrl} alt={branding.companyName} className="brand-logo" />
          ) : null}
          <span>{branding.companyName}</span>
          <span className="tag">#IT-DESK</span>
        </div>

        <div className="pitch">
          <h1>Bir dakikada hesabını oluştur.</h1>
          <p>Kayıt olduktan sonra bilgi işlem departmanına doğrudan destek talebi açabilirsin.</p>
        </div>

        <div className="stub-row">
          <div className="mini-stub">
            <span className="dot" style={{ background: '#5b7cf5' }} />
            Talep aç
          </div>
          <div className="mini-stub">
            <span className="dot" style={{ background: '#3fbf8f' }} />
            Durumu takip et
          </div>
          <div className="mini-stub">
            <span className="dot" style={{ background: '#8891a3' }} />
            Geçmişi gör
          </div>
        </div>
      </div>

      <div className="auth-panel">
        <div className="auth-card">
          <p className="eyebrow">Yeni hesap</p>
          <h2>Kayıt ol</h2>

          {error && <div className="form-error visible">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="fullName">Ad Soyad</label>
              <input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ayşe Yılmaz"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="email">E-posta</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@sirket.com"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">Şifre</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="En az 6 karakter"
                minLength={6}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Kaydediliyor...' : 'Kayıt Ol'}
            </button>
          </form>

          <p className="auth-foot">
            Zaten hesabın var mı? <Link to="/login">Giriş yap</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
