import { Fragment, useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { usersApi } from '../api';
import { SkeletonList } from '../components/SkeletonList';
import { AdminUser } from '../types';
import { BrandSettingsPanel } from '../components/BrandSettingsPanel';
import { Avatar } from '../components/Avatar';

export function AdminPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const data = await usersApi.getAll();
      setUsers(data);
    } catch {
      setError('Kullanıcılar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }

  async function toggleRole(u: AdminUser) {
    const newRole = u.role === 'ITStaff' ? 'Requester' : 'ITStaff';
    try {
      await usersApi.updateRole(u.id, newRole);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: newRole } : x)));
    } catch {
      setError('Rol güncellenemedi.');
    }
  }

  return (
    <>
      <div className="main-header">
        <div>
          <h1>Kullanıcılar</h1>
          <p className="sub">Sistemdeki tüm kullanıcıları görüntüle ve rollerini yönet.</p>
        </div>
      </div>

      <BrandSettingsPanel />

      {error && <p className="error">{error}</p>}

      {loading ? (
        <SkeletonList rows={4} />
      ) : (
        <div className="panel">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ad Soyad</th>
                <th>E-posta</th>
                <th>Rol</th>
                <th>Giriş Türü</th>
                <th>Kayıt Tarihi</th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <Fragment key={u.id}>
                  <tr>
                    <td>
                      <span className="user-cell">
                        <Avatar name={u.fullName} size={26} />
                        {u.fullName}
                      </span>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`role-chip ${u.role === 'ITStaff' ? 'role-staff' : 'role-user'}`}>
                        {u.role === 'ITStaff' ? 'Bilgi İşlem' : 'Kullanıcı'}
                      </span>
                    </td>
                    <td className="text-muted-sm">{u.windowsUsername ? 'Windows/AD' : 'E-posta'}</td>
                    <td className="text-muted-sm">{new Date(u.createdAt).toLocaleDateString('tr-TR')}</td>
                    <td>
                      {u.windowsUsername && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setExpandedId(expandedId === u.id ? null : u.id)}
                        >
                          {expandedId === u.id ? 'Gizle' : 'AD Bilgisi'}
                        </button>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => toggleRole(u)}
                        disabled={u.id === currentUser?.userId}
                        title={u.id === currentUser?.userId ? 'Kendi rolünü değiştiremezsin' : ''}
                      >
                        {u.role === 'ITStaff' ? 'Kullanıcı Yap' : 'IT Personeli Yap'}
                      </button>
                    </td>
                  </tr>
                  {expandedId === u.id && (
                    <tr key={`${u.id}-ad`}>
                      <td colSpan={7}>
                        <div className="asset-spec-grid" style={{ padding: '8px 4px' }}>
                          <div>
                            <span className="spec-label">Departman</span>
                            <span>{u.department ?? '—'}</span>
                          </div>
                          <div>
                            <span className="spec-label">Unvan</span>
                            <span>{u.jobTitle ?? '—'}</span>
                          </div>
                          <div>
                            <span className="spec-label">Yönetici</span>
                            <span>{u.manager ?? '—'}</span>
                          </div>
                          <div>
                            <span className="spec-label">Telefon</span>
                            <span>{u.phone ?? '—'}</span>
                          </div>
                          <div>
                            <span className="spec-label">Ofis</span>
                            <span>{u.office ?? '—'}</span>
                          </div>
                          <div>
                            <span className="spec-label">Windows Kullanıcı Adı</span>
                            <span>{u.windowsUsername}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
