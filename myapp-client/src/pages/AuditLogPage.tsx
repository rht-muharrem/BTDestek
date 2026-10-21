import { useEffect, useState } from 'react';
import { auditApi } from '../api';
import { SkeletonList } from '../components/SkeletonList';
import { AUDIT_ACTION_LABELS, AuditLogEntry } from '../types';

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('All');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const data = await auditApi.getAll();
      setLogs(data);
      setError(null);
    } catch {
      setError('Denetim kayıtları yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }

  const actionOptions = ['All', ...Array.from(new Set(logs.map((l) => l.action)))];

  const filtered = logs.filter((l) => {
    if (actionFilter !== 'All' && l.action !== actionFilter) return false;
    if (!search.trim()) return true;
    const s = search.trim().toLocaleLowerCase('tr-TR');
    return (
      l.details.toLocaleLowerCase('tr-TR').includes(s) || l.performedByName.toLocaleLowerCase('tr-TR').includes(s)
    );
  });

  return (
    <>
      <div className="main-header">
        <div>
          <h1>Denetim Kaydı</h1>
          <p className="sub">Sistemde kim, ne zaman, ne yaptı — kronolojik olarak.</p>
        </div>
      </div>

      <div className="toolbar">
        <input
          type="text"
          placeholder="Kullanıcı veya detay ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
          {actionOptions.map((a) => (
            <option key={a} value={a}>
              {a === 'All' ? 'Tüm Eylemler' : AUDIT_ACTION_LABELS[a] ?? a}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <SkeletonList rows={5} />
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="glyph">∅</div>
          Kayıt bulunamadı.
        </div>
      ) : (
        <div className="panel">
          <table className="data-table">
            <thead>
              <tr>
                <th>Zaman</th>
                <th>Kullanıcı</th>
                <th>Eylem</th>
                <th>Detay</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id}>
                  <td className="text-muted-sm" style={{ whiteSpace: 'nowrap' }}>
                    {fmtDateTime(log.timestamp)}
                  </td>
                  <td>
                    {log.performedByName === 'Sistem (otomatik)' ? (
                      <span className="category-chip">⚙ Sistem</span>
                    ) : (
                      log.performedByName
                    )}
                  </td>
                  <td>
                    <span className="role-chip role-staff">{AUDIT_ACTION_LABELS[log.action] ?? log.action}</span>
                  </td>
                  <td className="text-muted-sm">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
