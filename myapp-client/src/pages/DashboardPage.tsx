import { useEffect, useState } from 'react';
import { reportsApi } from '../api';
import { CountUp } from '../components/CountUp';
import { SkeletonList } from '../components/SkeletonList';
import { CATEGORY_LABELS, PRIORITY_LABELS, ReportSummary, TicketCategory, TicketPriority } from '../types';

function downloadWordReport(filename: string, title: string, bodyHtml: string) {
  const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>${title}</title>
<!--[if gte mso 9]>
<xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml>
<![endif]-->
<style>
  body { font-family: Calibri, Arial, sans-serif; color: #1f2430; }
  h1 { color: #2952E3; font-size: 22px; margin-bottom: 4px; }
  .subtitle { color: #6b7280; font-size: 12px; margin-bottom: 24px; }
  h2 { font-size: 15px; color: #1f2430; border-bottom: 1px solid #2952E3; padding-bottom: 4px; margin-top: 28px; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 10px; }
  th, td { border: 1px solid #ccc; padding: 6px 10px; font-size: 12px; text-align: left; }
  th { background: #2952E3; color: white; }
  tr:nth-child(even) td { background: #f3f4f7; }
  .overdue { color: #b8341f; font-weight: bold; }
</style>
</head>
<body>
<h1>${title}</h1>
<p class="subtitle">Oluşturulma tarihi: ${new Date().toLocaleString('tr-TR')}</p>
${bodyHtml}
</body>
</html>`;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function DashboardPage() {
  const [data, setData] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    reportsApi
      .summary()
      .then(setData)
      .catch(() => setError('İstatistikler yüklenemedi.'))
      .finally(() => setLoading(false));
  }, []);

  function handleExportWord() {
    if (!data) return;

    const summaryTable = `
      <h2>Genel Özet</h2>
      <table>
        <tr><th>Metrik</th><th>Değer</th></tr>
        <tr><td>Toplam Talep</td><td>${data.totalTickets}</td></tr>
        <tr><td>Açık</td><td>${data.openCount}</td></tr>
        <tr><td>İşleme Alındı</td><td>${data.inProgressCount}</td></tr>
        <tr><td>Çözüldü</td><td>${data.resolvedCount}</td></tr>
        <tr><td>Kapatıldı</td><td>${data.closedCount}</td></tr>
        <tr><td>Ortalama Çözüm Süresi</td><td>${data.avgResolutionHours} saat</td></tr>
        <tr><td>Ortalama Memnuniyet</td><td>${data.avgSatisfaction !== null ? `${data.avgSatisfaction} / 5 (${data.ratedTicketCount} oy)` : 'Henüz oy yok'}</td></tr>
      </table>`;

    const staffTable = `
      <h2>Personel Performansı</h2>
      <table>
        <tr><th>Personel</th><th>Atanan</th><th>Çözülen</th></tr>
        ${data.byStaff.map((s) => `<tr><td>${s.staffName}</td><td>${s.assignedCount}</td><td>${s.resolvedCount}</td></tr>`).join('')}
      </table>`;

    const categoryTable = `
      <h2>Kategoriye Göre Talepler</h2>
      <table>
        <tr><th>Kategori</th><th>Adet</th></tr>
        ${Object.entries(data.byCategory)
          .map(([cat, count]) => `<tr><td>${CATEGORY_LABELS[cat as TicketCategory] ?? cat}</td><td>${count}</td></tr>`)
          .join('')}
      </table>`;

    const priorityTable = `
      <h2>Önceliğe Göre Talepler</h2>
      <table>
        <tr><th>Öncelik</th><th>Adet</th></tr>
        ${Object.entries(data.byPriority)
          .map(([p, count]) => `<tr><td>${PRIORITY_LABELS[p as TicketPriority] ?? p}</td><td>${count}</td></tr>`)
          .join('')}
      </table>`;

    const overdueTable =
      data.overdueTickets.length === 0
        ? '<h2>SLA Süresini Aşan Talepler</h2><p>Şu an SLA süresini aşan talep bulunmuyor.</p>'
        : `
      <h2>SLA Süresini Aşan Talepler</h2>
      <table>
        <tr><th>#</th><th>Başlık</th><th>Öncelik</th><th>Atanan</th><th>Açık Kalma / Hedef</th></tr>
        ${data.overdueTickets
          .map(
            (o) =>
              `<tr><td>#${o.id}</td><td>${o.title}</td><td>${PRIORITY_LABELS[o.priority as TicketPriority] ?? o.priority}</td><td>${o.assignedToName ?? 'Atanmadı'}</td><td class="overdue">${o.hoursOpen} sa / ${o.slaHours} sa</td></tr>`
          )
          .join('')}
      </table>`;

    downloadWordReport(
      `destek-raporu-${new Date().toISOString().slice(0, 10)}.doc`,
      'Destek Masası — Genel Bakış Raporu',
      summaryTable + overdueTable + categoryTable + priorityTable + staffTable
    );
  }

  const maxDaily = data ? Math.max(1, ...data.last30Days.map((d) => d.count)) : 1;

  return (
    <>
      <div className="main-header">
        <div>
          <h1>Genel Bakış Paneli</h1>
          <p className="sub">Talep hacmi, çözüm süreleri, SLA takibi ve personel performansı.</p>
        </div>
        <div className="dashboard-actions">
          <button className="btn btn-ghost btn-sm" onClick={handleExportWord} disabled={!data}>
            Word Olarak İndir
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>
            Yazdır / PDF
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {loading || !data ? (
        <SkeletonList rows={6} />
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <span className="stat-value"><CountUp value={data.totalTickets} /></span>
              <span className="stat-label">Toplam Talep</span>
            </div>
            <div className="stat-card">
              <span className="stat-value stat-open"><CountUp value={data.openCount} /></span>
              <span className="stat-label">Açık</span>
            </div>
            <div className="stat-card">
              <span className="stat-value stat-progress"><CountUp value={data.inProgressCount} /></span>
              <span className="stat-label">İşleme Alındı</span>
            </div>
            <div className="stat-card">
              <span className="stat-value stat-resolved"><CountUp value={data.resolvedCount} /></span>
              <span className="stat-label">Çözüldü</span>
            </div>
            <div className="stat-card">
              <span className="stat-value stat-closed"><CountUp value={data.closedCount} /></span>
              <span className="stat-label">Kapatıldı</span>
            </div>
            <div className="stat-card">
              <span className="stat-value"><CountUp value={data.avgResolutionHours} decimals={1} /></span>
              <span className="stat-label">Ort. Çözüm Süresi (saat)</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {data.avgSatisfaction !== null ? `${data.avgSatisfaction} ★` : '—'}
              </span>
              <span className="stat-label">
                Memnuniyet {data.ratedTicketCount > 0 ? `(${data.ratedTicketCount} oy)` : ''}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-value" style={{ color: data.overdueTickets.length ? 'var(--priority-critical)' : undefined }}>
                <CountUp value={data.overdueTickets.length} />
              </span>
              <span className="stat-label">SLA Aşan Talep</span>
            </div>
          </div>

          {/* Son 30 gün - açılan talep sayısı */}
          <div className="panel" style={{ marginTop: 24 }}>
            <p className="panel-title">Son 30 Günde Açılan Talepler</p>
            <div className="mini-chart">
              {data.last30Days.map((d) => (
                <div key={d.date} className="mini-bar-col" title={`${d.date}: ${d.count} talep`}>
                  <div className="mini-bar" style={{ height: `${(d.count / maxDaily) * 100}%` }} />
                </div>
              ))}
            </div>
            <div className="mini-chart-labels">
              <span>{data.last30Days[0]?.date}</span>
              <span>{data.last30Days[data.last30Days.length - 1]?.date}</span>
            </div>
          </div>

          {/* SLA aşan talepler */}
          {data.overdueTickets.length > 0 && (
            <div className="panel" style={{ marginTop: 24 }}>
              <p className="panel-title">SLA Süresini Aşan Talepler</p>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Başlık</th>
                    <th>Öncelik</th>
                    <th>Atanan</th>
                    <th>Açık Kalma / Hedef</th>
                  </tr>
                </thead>
                <tbody>
                  {data.overdueTickets.map((o) => (
                    <tr key={o.id}>
                      <td className="text-muted-sm">#{o.id}</td>
                      <td>{o.title}</td>
                      <td>
                        <span className={`category-chip prio-fill-${o.priority}`} style={{ color: 'white', border: 'none' }}>
                          {PRIORITY_LABELS[o.priority as TicketPriority] ?? o.priority}
                        </span>
                      </td>
                      <td className="text-muted-sm">{o.assignedToName ?? 'Atanmadı'}</td>
                      <td className="text-muted-sm" style={{ color: 'var(--priority-critical)', fontWeight: 600 }}>
                        {o.hoursOpen} sa / {o.slaHours} sa
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="panel" style={{ marginTop: 24 }}>
            <p className="panel-title">Kategoriye Göre Talepler</p>
            <div className="bar-list">
              {Object.entries(data.byCategory).map(([cat, count]) => (
                <div key={cat} className="bar-row">
                  <span className="bar-label">{CATEGORY_LABELS[cat as TicketCategory] ?? cat}</span>
                  <div className="bar-track">
                    <div
                      className={`bar-fill cat-fill-${cat}`}
                      style={{ width: `${data.totalTickets ? (count / data.totalTickets) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="bar-count">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel" style={{ marginTop: 24 }}>
            <p className="panel-title">Önceliğe Göre Talepler</p>
            <div className="bar-list">
              {Object.entries(data.byPriority).map(([p, count]) => (
                <div key={p} className="bar-row">
                  <span className="bar-label">{PRIORITY_LABELS[p as TicketPriority] ?? p}</span>
                  <div className="bar-track">
                    <div
                      className={`bar-fill prio-fill-${p}`}
                      style={{ width: `${data.totalTickets ? (count / data.totalTickets) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="bar-count">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel" style={{ marginTop: 24 }}>
            <p className="panel-title">Personel Performansı</p>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Personel</th>
                  <th>Atanan</th>
                  <th>Çözülen</th>
                </tr>
              </thead>
              <tbody>
                {data.byStaff.map((s) => (
                  <tr key={s.staffName}>
                    <td>{s.staffName}</td>
                    <td>{s.assignedCount}</td>
                    <td>{s.resolvedCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
