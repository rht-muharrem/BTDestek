import { FormEvent, useEffect, useState } from 'react';
import { assetsApi, usersApi } from '../api';
import { SkeletonList } from '../components/SkeletonList';
import { ASSET_TYPE_LABELS, AdminUser, Asset, AssetTicketHistoryItem, AssetType, STATUS_LABELS } from '../types';

const EMPTY_FORM = {
  assetTag: '',
  type: 'Computer' as AssetType,
  brand: '',
  model: '',
  serialNumber: '',
  ipAddress: '',
  macAddress: '',
  operatingSystem: '',
  ram: '',
  cpu: '',
  assignedUserId: '' as number | '',
  department: '',
  location: '',
  notes: '',
};

export function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<AssetType | 'All'>('All');

  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [historyForId, setHistoryForId] = useState<number | null>(null);
  const [history, setHistory] = useState<AssetTicketHistoryItem[]>([]);

  useEffect(() => {
    load();
    usersApi.getAll().then(setUsers).catch(() => {});
  }, []);

  async function load() {
    try {
      setLoading(true);
      const data = await assetsApi.getAll();
      setAssets(data);
      setError(null);
    } catch {
      setError('Envanter yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }

  function openCreatePanel() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setPanelOpen(true);
  }

  function openEditPanel(a: Asset) {
    setEditingId(a.id);
    setForm({
      assetTag: a.assetTag,
      type: a.type,
      brand: a.brand ?? '',
      model: a.model ?? '',
      serialNumber: a.serialNumber ?? '',
      ipAddress: a.ipAddress ?? '',
      macAddress: a.macAddress ?? '',
      operatingSystem: a.operatingSystem ?? '',
      ram: a.ram ?? '',
      cpu: a.cpu ?? '',
      assignedUserId: a.assignedUserId ?? '',
      department: a.department ?? '',
      location: a.location ?? '',
      notes: a.notes ?? '',
    });
    setPanelOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.assetTag.trim() && editingId === null) {
      setError('Varlık etiketi zorunludur.');
      return;
    }

    const payload = {
      type: form.type,
      brand: form.brand || undefined,
      model: form.model || undefined,
      serialNumber: form.serialNumber || undefined,
      ipAddress: form.ipAddress || undefined,
      macAddress: form.macAddress || undefined,
      operatingSystem: form.operatingSystem || undefined,
      ram: form.ram || undefined,
      cpu: form.cpu || undefined,
      assignedUserId: form.assignedUserId === '' ? null : Number(form.assignedUserId),
      department: form.department || undefined,
      location: form.location || undefined,
      notes: form.notes || undefined,
    };

    try {
      if (editingId !== null) {
        const updated = await assetsApi.update(editingId, { ...payload, isRetired: false });
        setAssets((prev) => prev.map((a) => (a.id === editingId ? updated : a)));
      } else {
        const created = await assetsApi.create({ assetTag: form.assetTag.trim(), ...payload });
        setAssets((prev) => [created, ...prev]);
      }
      setPanelOpen(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      setError(null);
    } catch {
      setError('Kaydedilemedi. Varlık etiketi zaten kullanılıyor olabilir.');
    }
  }

  async function handleToggleRetire(a: Asset) {
    try {
      const updated = await assetsApi.update(a.id, {
        type: a.type,
        brand: a.brand ?? undefined,
        model: a.model ?? undefined,
        serialNumber: a.serialNumber ?? undefined,
        ipAddress: a.ipAddress ?? undefined,
        macAddress: a.macAddress ?? undefined,
        operatingSystem: a.operatingSystem ?? undefined,
        ram: a.ram ?? undefined,
        cpu: a.cpu ?? undefined,
        assignedUserId: a.assignedUserId,
        department: a.department ?? undefined,
        location: a.location ?? undefined,
        notes: a.notes ?? undefined,
        isRetired: !a.isRetired,
      });
      setAssets((prev) => prev.map((x) => (x.id === a.id ? updated : x)));
    } catch {
      setError('Güncellenemedi.');
    }
  }

  async function handleDelete(id: number) {
    try {
      await assetsApi.remove(id);
      setAssets((prev) => prev.filter((a) => a.id !== id));
    } catch {
      setError('Silinemedi.');
    }
  }

  async function toggleHistory(a: Asset) {
    if (historyForId === a.id) {
      setHistoryForId(null);
      return;
    }
    setHistoryForId(a.id);
    try {
      const data = await assetsApi.getTicketHistory(a.id);
      setHistory(data);
    } catch {
      setHistory([]);
    }
  }

  const filtered = assets.filter((a) => {
    if (typeFilter !== 'All' && a.type !== typeFilter) return false;
    if (search.trim()) {
      const s = search.trim().toLocaleLowerCase('tr-TR');
      const hay = `${a.assetTag} ${a.brand ?? ''} ${a.model ?? ''} ${a.serialNumber ?? ''}`.toLocaleLowerCase('tr-TR');
      if (!hay.includes(s)) return false;
    }
    return true;
  });

  return (
    <>
      <div className="main-header">
        <div>
          <h1>Envanter</h1>
          <p className="sub">Şirket cihazlarını kayıt altına al, kullanıcıya ata, talep geçmişini gör.</p>
        </div>
        <button className="btn btn-primary" style={{ width: 'auto' }} onClick={openCreatePanel}>
          {panelOpen && editingId === null ? 'Vazgeç' : '+ Yeni Cihaz'}
        </button>
      </div>

      <div className="toolbar">
        <input
          type="text"
          placeholder="Etiket, marka, model veya seri no ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as AssetType | 'All')}>
          <option value="All">Tüm Tipler</option>
          {Object.entries(ASSET_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {panelOpen && (
        <div className="panel">
          <p className="panel-title">{editingId !== null ? 'Cihazı Düzenle' : 'Yeni Cihaz Ekle'}</p>
          <form onSubmit={handleSubmit}>
            <div className="field-row">
              <div className="field">
                <label>Varlık Etiketi (örn. PC-000142)</label>
                <input
                  value={form.assetTag}
                  onChange={(e) => setForm({ ...form, assetTag: e.target.value })}
                  disabled={editingId !== null}
                  required={editingId === null}
                />
              </div>
              <div className="field">
                <label>Tip</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AssetType })}>
                  {Object.entries(ASSET_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Marka</label>
                <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Lenovo" />
              </div>
              <div className="field">
                <label>Model</label>
                <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="LOQ 15ARP9" />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Seri No</label>
                <input value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} />
              </div>
              <div className="field">
                <label>IP Adresi</label>
                <input value={form.ipAddress} onChange={(e) => setForm({ ...form, ipAddress: e.target.value })} placeholder="192.168.1.25" />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>MAC Adresi</label>
                <input value={form.macAddress} onChange={(e) => setForm({ ...form, macAddress: e.target.value })} />
              </div>
              <div className="field">
                <label>İşletim Sistemi</label>
                <input value={form.operatingSystem} onChange={(e) => setForm({ ...form, operatingSystem: e.target.value })} placeholder="Windows 11" />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>RAM</label>
                <input value={form.ram} onChange={(e) => setForm({ ...form, ram: e.target.value })} placeholder="16 GB" />
              </div>
              <div className="field">
                <label>CPU</label>
                <input value={form.cpu} onChange={(e) => setForm({ ...form, cpu: e.target.value })} placeholder="Ryzen 7" />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Zimmetli Kullanıcı</label>
                <select
                  value={form.assignedUserId}
                  onChange={(e) => setForm({ ...form, assignedUserId: e.target.value ? Number(e.target.value) : '' })}
                >
                  <option value="">Kimseye atanmadı</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Departman</label>
                <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="IT" />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Lokasyon</label>
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Antalya" />
              </div>
            </div>
            <div className="field">
              <label>Notlar</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>
              {editingId !== null ? 'Güncelle' : 'Kaydet'}
            </button>
          </form>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {loading ? (
        <SkeletonList rows={4} />
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="glyph">∅</div>
          Envanterde cihaz bulunamadı.
        </div>
      ) : (
        <div className="ticket-list">
          {filtered.map((a) => (
            <div key={a.id} className={`asset-card${a.isRetired ? ' retired' : ''}`}>
              <div className="asset-card-head">
                <div>
                  <h3>{a.assetTag}</h3>
                  <span className="text-muted-sm">{ASSET_TYPE_LABELS[a.type]}</span>
                  {a.isRetired && <span className="role-chip role-user" style={{ marginLeft: 8 }}>Kullanım Dışı</span>}
                </div>
                <div className="asset-card-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => openEditPanel(a)}>
                    Düzenle
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleToggleRetire(a)}>
                    {a.isRetired ? 'Aktif Et' : 'Kullanım Dışı Bırak'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(a.id)}>
                    Sil
                  </button>
                </div>
              </div>

              <div className="asset-spec-grid">
                <div>
                  <span className="spec-label">Marka/Model</span>
                  <span>{[a.brand, a.model].filter(Boolean).join(' ') || '—'}</span>
                </div>
                <div>
                  <span className="spec-label">Seri No</span>
                  <span>{a.serialNumber ?? '—'}</span>
                </div>
                <div>
                  <span className="spec-label">IP</span>
                  <span>{a.ipAddress ?? '—'}</span>
                </div>
                <div>
                  <span className="spec-label">MAC</span>
                  <span>{a.macAddress ?? '—'}</span>
                </div>
                <div>
                  <span className="spec-label">İşletim Sistemi</span>
                  <span>{a.operatingSystem ?? '—'}</span>
                </div>
                <div>
                  <span className="spec-label">RAM / CPU</span>
                  <span>{[a.ram, a.cpu].filter(Boolean).join(' / ') || '—'}</span>
                </div>
                <div>
                  <span className="spec-label">Kullanıcı</span>
                  <span>{a.assignedUserName ?? 'Atanmadı'}</span>
                </div>
                <div>
                  <span className="spec-label">Departman / Lokasyon</span>
                  <span>{[a.department, a.location].filter(Boolean).join(' / ') || '—'}</span>
                </div>
              </div>

              {a.notes && <p className="text-muted-sm" style={{ marginTop: 8 }}>{a.notes}</p>}

              <div className="actions" style={{ marginTop: 10 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => toggleHistory(a)}>
                  {historyForId === a.id ? 'Talep Geçmişini Gizle' : 'Talep Geçmişini Göster'}
                </button>
              </div>

              {historyForId === a.id && (
                <div className="ticket-detail">
                  <p className="detail-heading">Bu Cihazla İlgili Talepler</p>
                  {history.length === 0 ? (
                    <p className="text-muted-sm">Bu cihazla ilgili henüz talep açılmamış.</p>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5 }}>
                      {history.map((h) => (
                        <li key={h.ticketId}>
                          #{h.ticketId} — {h.title} ({STATUS_LABELS[h.status]})
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
