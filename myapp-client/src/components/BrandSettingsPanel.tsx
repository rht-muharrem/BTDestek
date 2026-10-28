import { ChangeEvent, FormEvent, useState } from 'react';
import { brandingApi } from '../api';
import { useBranding } from '../BrandingContext';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function BrandSettingsPanel() {
  const { branding, refreshBranding } = useBranding();
  const [companyName, setCompanyName] = useState(branding.companyName);
  const [preview, setPreview] = useState<string | null>(branding.logoDataUrl);
  const [pendingBase64, setPendingBase64] = useState<string | null | undefined>(undefined);
  const [pendingContentType, setPendingContentType] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (file.size > 2 * 1024 * 1024) {
      setError('Logo çok büyük (maksimum 2MB).');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Lütfen bir görsel dosyası seç.');
      return;
    }

    const base64 = await fileToBase64(file);
    setPendingBase64(base64);
    setPendingContentType(file.type);
    setPreview(`data:${file.type};base64,${base64}`);
  }

  function handleRemoveLogo() {
    setPendingBase64('');
    setPendingContentType(null);
    setPreview(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await brandingApi.update(
        companyName.trim(),
        pendingBase64 === undefined ? null : pendingBase64,
        pendingContentType
      );
      await refreshBranding();
      setPendingBase64(undefined);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="panel" style={{ marginBottom: 24 }}>
      <p className="panel-title">Marka Ayarları</p>
      <form onSubmit={handleSubmit}>
        <div className="field-row">
          <div className="field">
            <label>Şirket Adı</label>
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
          </div>
          <div className="field">
            <label>Logo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {preview ? (
                <img src={preview} alt="Logo önizleme" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 6, background: 'white' }} />
              ) : (
                <div className="logo-placeholder">Logo yok</div>
              )}
              <label className="file-input-label">
                Dosya Seç
                <input type="file" accept="image/*" onChange={handleFileSelect} />
              </label>
              {preview && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={handleRemoveLogo}>
                  Kaldır
                </button>
              )}
            </div>
          </div>
        </div>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="btn btn-primary" style={{ width: 'auto' }} disabled={saving}>
          {saving ? 'Kaydediliyor...' : saved ? '✓ Kaydedildi' : 'Kaydet'}
        </button>
      </form>
    </div>
  );
}
