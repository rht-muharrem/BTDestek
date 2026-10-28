import { FormEvent, useEffect, useRef, useState } from 'react';
import { useAuth } from '../AuthContext';
import { useRealtime } from '../RealtimeContext';
import { ticketsApi, assetsApi } from '../api';
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  ASSET_TYPE_LABELS,
  Asset,
  Ticket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../types';
import { TicketDetail } from '../components/TicketDetail';
import { SkeletonList } from '../components/SkeletonList';
import { AiSolutionPanel } from '../components/AiSolutionPanel';
import { StarRating } from '../components/StarRating';
import { Avatar } from '../components/Avatar';
import { TICKET_TEMPLATES } from '../data';
import { showDesktopNotification } from '../browserNotifications';

const STATUS_OPTIONS: TicketStatus[] = ['Open', 'InProgress', 'Resolved', 'Closed'];
const FILTER_OPTIONS: Array<TicketStatus | 'All'> = ['All', 'Open', 'InProgress', 'Resolved', 'Closed'];
const FILTER_LABELS: Record<TicketStatus | 'All', string> = { All: 'Tümü', ...STATUS_LABELS };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TicketsPage() {
  const { user } = useAuth();
  const isStaff = user?.role === 'ITStaff';
  const { connection } = useRealtime();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'All'>('All');
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | 'All'>('All');
  const [searchText, setSearchText] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [flashIds, setFlashIds] = useState<Set<number>>(new Set());
  const [pendingRatingIds, setPendingRatingIds] = useState<Set<number>>(new Set());

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showMergePanel, setShowMergePanel] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState<number | null>(null);
  const [bulkStatus, setBulkStatus] = useState<TicketStatus>('InProgress');

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('Medium');
  const [category, setCategory] = useState<TicketCategory>('Other');
  const [assetId, setAssetId] = useState<number | ''>('');
  const [myAssets, setMyAssets] = useState<Asset[]>([]);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTickets();
    if (!isStaff) {
      assetsApi
        .getMine()
        .then((assets) => {
          setMyAssets(assets);
          if (assets.length > 0) setAssetId(assets[0].id);
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!connection || !isStaff) return;

    function handleNewTicket(ticket: Ticket) {
      setTickets((prev) => (prev.some((t) => t.id === ticket.id) ? prev : [ticket, ...prev]));
      setFlashIds((prev) => new Set(prev).add(ticket.id));
      setTimeout(() => {
        setFlashIds((prev) => {
          const next = new Set(prev);
          next.delete(ticket.id);
          return next;
        });
      }, 3000);
      showDesktopNotification(`🔴 Yeni Talep #${ticket.id}`, ticket.title);
    }

    function handleTicketUpdated(ticket: Ticket) {
      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? ticket : t)));
    }

    connection.on('NewTicket', handleNewTicket);
    connection.on('TicketUpdated', handleTicketUpdated);
    return () => {
      connection.off('NewTicket', handleNewTicket);
      connection.off('TicketUpdated', handleTicketUpdated);
    };
  }, [connection, isStaff]);

  async function loadTickets() {
    try {
      setLoading(true);
      const data = await ticketsApi.getAll();
      setTickets(data);
      setError(null);
    } catch (err) {
      setError('Talepler yüklenemedi. API çalışıyor mu? (http://localhost:5000)');
    } finally {
      setLoading(false);
    }
  }

  function togglePanel() {
    const willOpen = !panelOpen;
    setPanelOpen(willOpen);
    if (willOpen) setTimeout(() => titleInputRef.current?.focus(), 350);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    try {
      const created = await ticketsApi.create(
        title.trim(),
        description.trim(),
        priority,
        category,
        assetId === '' ? null : assetId
      );
      setTickets((prev) => [created, ...prev]);
      setTitle('');
      setDescription('');
      setPriority('Medium');
      setCategory('Other');
      setAssetId('');
      setPanelOpen(false);
    } catch (err) {
      setError('Talep oluşturulamadı.');
    }
  }

  async function handleAssign(id: number) {
    try {
      const updated = await ticketsApi.assignToSelf(id);
      setTickets((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch (err) {
      setError('Talep üstlenilemedi.');
    }
  }

  async function handleStatusChange(id: number, status: TicketStatus) {
    try {
      const updated = await ticketsApi.updateStatus(id, status);
      setTickets((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch (err) {
      setError('Durum güncellenemedi.');
    }
  }

  async function handleConfirmClose(id: number) {
    try {
      const updated = await ticketsApi.confirmClose(id);
      setTickets((prev) => prev.map((t) => (t.id === id ? updated : t)));
      setPendingRatingIds((prev) => new Set(prev).add(id));
    } catch (err) {
      setError('Talep onaylanamadı.');
    }
  }

  async function handleRate(id: number, rating: number) {
    try {
      const updated = await ticketsApi.rate(id, rating);
      setTickets((prev) => prev.map((t) => (t.id === id ? updated : t)));
      setPendingRatingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      setError('Puan kaydedilemedi.');
    }
  }

  function applyTemplate(template: (typeof TICKET_TEMPLATES)[number]) {
    setTitle(template.title);
    setDescription(template.description);
    setCategory(template.category);
    setPriority(template.priority);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  }

  function bumpCommentCount(id: number) {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, commentCount: t.commentCount + 1 } : t)));
  }

  function bumpAttachmentCount(id: number) {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, attachmentCount: t.attachmentCount + 1 } : t)));
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function handleBulkAssign() {
    if (selectedIds.size === 0) return;
    try {
      const updated = await ticketsApi.bulkAssign(Array.from(selectedIds));
      setTickets((prev) => prev.map((t) => updated.find((u) => u.id === t.id) ?? t));
      clearSelection();
    } catch {
      setError('Toplu üstlenme işlemi başarısız oldu.');
    }
  }

  async function handleBulkStatusApply() {
    if (selectedIds.size === 0) return;
    try {
      const updated = await ticketsApi.bulkUpdateStatus(Array.from(selectedIds), bulkStatus);
      setTickets((prev) => prev.map((t) => updated.find((u) => u.id === t.id) ?? t));
      clearSelection();
    } catch {
      setError('Toplu durum güncelleme başarısız oldu.');
    }
  }

  function openMergePanel() {
    setMergeTargetId(Array.from(selectedIds)[0] ?? null);
    setShowMergePanel(true);
  }

  async function handleConfirmMerge() {
    if (!mergeTargetId) return;
    const sourceIds = Array.from(selectedIds).filter((id) => id !== mergeTargetId);
    try {
      for (const sourceId of sourceIds) {
        await ticketsApi.merge(sourceId, mergeTargetId);
      }
      await loadTickets();
      clearSelection();
      setShowMergePanel(false);
    } catch {
      setError('Talepler birleştirilemedi.');
    }
  }

  function getSlaInfo(t: Ticket): { text: string; overdue: boolean; urgent: boolean } | null {
    if (t.status !== 'Open' && t.status !== 'InProgress') return null;
    const deadline = new Date(t.createdAt).getTime() + t.slaHours * 3600 * 1000;
    const diffMs = deadline - now;
    const overdue = diffMs < 0;
    const abs = Math.abs(diffMs);
    const hours = Math.floor(abs / 3600000);
    const mins = Math.floor((abs % 3600000) / 60000);
    const text = overdue ? `SLA aşıldı — ${hours}sa ${mins}dk` : `SLA: ${hours}sa ${mins}dk kaldı`;
    const urgent = !overdue && diffMs < 2 * 3600 * 1000;
    return { text, overdue, urgent };
  }

  const filteredTickets = tickets.filter((t) => {
    const awaitingRating = pendingRatingIds.has(t.id);

    if (statusFilter === 'All') {
      if (t.status === 'Closed' && !awaitingRating) return false;
    } else if (t.status !== statusFilter && !awaitingRating) {
      return false;
    }
    if (isStaff && categoryFilter !== 'All' && t.category !== categoryFilter) return false;
    if (searchText.trim()) {
      const s = searchText.trim().toLocaleLowerCase('tr-TR');
      const title = t.title.toLocaleLowerCase('tr-TR');
      const desc = t.description.toLocaleLowerCase('tr-TR');
      if (!title.includes(s) && !desc.includes(s)) return false;
    }
    return true;
  });

  return (
    <>
      <div className="main-header">
        <div>
          <h1>{isStaff ? 'Tüm Destek Talepleri' : 'Taleplerim'}</h1>
          <p className="sub">
            {isStaff
              ? 'Departman genelindeki tüm talepleri görüntüle, üstlen ve durumunu güncelle.'
              : 'Açtığın destek taleplerini ve güncel durumlarını buradan takip edebilirsin.'}
          </p>
        </div>
        {!isStaff && (
          <button className="btn btn-primary" style={{ width: 'auto' }} onClick={togglePanel}>
            {panelOpen ? 'Vazgeç' : '+ Yeni Talep'}
          </button>
        )}
      </div>

      <div className="toolbar">
        <input
          type="text"
          placeholder="Talep ara..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="search-input"
        />
        <div className="pill-tabs">
          {FILTER_OPTIONS.map((f) => (
            <button key={f} className={statusFilter === f ? 'active' : ''} onClick={() => setStatusFilter(f)}>
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
        {isStaff && (
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as TicketCategory | 'All')}>
            <option value="All">Tüm Kategoriler</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        )}
      </div>

      {isStaff && selectedIds.size > 0 && (
        <div className="bulk-bar">
          <span className="bulk-count">{selectedIds.size} talep seçildi</span>
          <button className="btn btn-ghost btn-sm" onClick={handleBulkAssign}>
            Hepsini Üstlen
          </button>
          <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as TicketStatus)}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={handleBulkStatusApply}>
            Durumu Uygula
          </button>
          {selectedIds.size >= 2 && (
            <button className="btn btn-ghost btn-sm" onClick={openMergePanel}>
              Birleştir
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={clearSelection}>
            Seçimi Temizle
          </button>
        </div>
      )}

      {showMergePanel && (
        <div className="panel merge-panel">
          <p className="panel-title">Talepleri Birleştir</p>
          <p className="text-muted-sm" style={{ marginBottom: 12 }}>
            Hangi talep "ana talep" olsun? Diğerleri buna birleştirilip kapatılacak.
          </p>
          {Array.from(selectedIds).map((id) => {
            const t = tickets.find((x) => x.id === id);
            if (!t) return null;
            return (
              <label key={id} className="merge-option">
                <input
                  type="radio"
                  name="mergeTarget"
                  checked={mergeTargetId === id}
                  onChange={() => setMergeTargetId(id)}
                />
                #{t.id} — {t.title}
              </label>
            );
          })}
          <div className="merge-actions">
            <button className="btn btn-primary btn-sm" onClick={handleConfirmMerge}>
              Birleştir
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowMergePanel(false)}>
              Vazgeç
            </button>
          </div>
        </div>
      )}

      {!isStaff && (
        <div className={`panel collapsible${panelOpen ? ' open' : ''}`}>
          <p className="panel-title">Yeni destek talebi</p>

          <div className="template-row">
            <span className="template-hint">Hızlı başla:</span>
            {TICKET_TEMPLATES.map((tpl) => (
              <button
                key={tpl.label}
                type="button"
                className={`template-chip template-chip-${tpl.category}`}
                onClick={() => applyTemplate(tpl)}
              >
                {tpl.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleCreate}>
            <div className="field">
              <label htmlFor="title">Başlık</label>
              <input
                id="title"
                ref={titleInputRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Kısaca sorunu özetle"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="description">Açıklama</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Sorunu detaylıca anlat: ne zaman başladı, hangi cihazda, hata mesajı var mı?"
                required
              />
            </div>

            <AiSolutionPanel title={title} description={description} />

            <div className="field-row">
              <div className="field">
                <label htmlFor="priority">Öncelik</label>
                <select id="priority" value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)}>
                  {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="category">Kategori</label>
                <select id="category" value={category} onChange={(e) => setCategory(e.target.value as TicketCategory)}>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {myAssets.length > 0 && (
              <div className="field">
                <label htmlFor="asset">Cihazınız (opsiyonel)</label>
                <select
                  id="asset"
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">Seçilmedi</option>
                  {myAssets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.assetTag} — {ASSET_TYPE_LABELS[a.type]} {a.brand ? `(${a.brand} ${a.model ?? ''})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>
              Talebi Gönder
            </button>
          </form>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {loading ? (
        <SkeletonList rows={5} />
      ) : filteredTickets.length === 0 ? (
        <div className="empty-state">
          <div className="glyph">∅</div>
          Görüntülenecek talep yok.
        </div>
      ) : (
        <div className="ticket-list">
          {filteredTickets.map((t) => {
            const isExpanded = expandedId === t.id;
            const sla = getSlaInfo(t);
            return (
              <div key={t.id} className={`ticket${selectedIds.has(t.id) ? ' selected' : ''}${flashIds.has(t.id) ? ' flash-new' : ''}`}>
                {isStaff && (
                  <label className="ticket-select" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(t.id)}
                      onChange={() => toggleSelect(t.id)}
                    />
                  </label>
                )}
                <div className={`stub stub-${t.priority}`}>
                  <span className="num">#{t.id}</span>
                  <span className={`prio-tag prio-${t.priority}`}>{PRIORITY_LABELS[t.priority]}</span>
                  <span className="notch-bottom" />
                </div>
                <div className="body">
                  <div className="body-top">
                    <h3>
                      {flashIds.has(t.id) && <span className="new-ticket-flag">🔴 Yeni</span>} {t.title}
                    </h3>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {sla && (
                        <span className={`sla-badge${sla.overdue ? ' overdue' : sla.urgent ? ' urgent' : ''}`}>
                          ⏱ {sla.text}
                        </span>
                      )}
                      <span className={`status-tag status-${t.status}`}>{STATUS_LABELS[t.status]}</span>
                    </div>
                  </div>
                  <p className="desc">{t.description}</p>
                  {t.mergedIntoTicketId && (
                    <p className="text-muted-sm" style={{ marginBottom: 8 }}>
                      🔗 Bu talep #{t.mergedIntoTicketId} numaralı talebe birleştirildi.
                    </p>
                  )}
                  <div className="meta">
                    <span className={`category-chip category-${t.category}`}>{CATEGORY_LABELS[t.category]}</span>
                    {t.assetTag && (
                      <span className="category-chip asset-chip">💻 {t.assetTag}</span>
                    )}
                    {isStaff && (
                      <span>
                        <span className="meta-label">Açan:</span>
                        <Avatar name={t.createdByName} size={18} />
                        {t.createdByName}
                      </span>
                    )}
                    <span>
                      <span className="meta-label">Atanan:</span>
                      {t.assignedToName ? (
                        <>
                          <Avatar name={t.assignedToName} size={18} />
                          {t.assignedToName}
                        </>
                      ) : (
                        'Henüz atanmadı'
                      )}
                    </span>
                    <span>
                      <span className="meta-label">Tarih:</span> {fmtDate(t.createdAt)}
                    </span>
                  </div>

                  {!isStaff && t.status === 'Closed' && (
                    <div className={`rating-banner${t.satisfactionRating ? ' rated' : ''}`}>
                      {t.satisfactionRating ? (
                        <>
                          <span className="rating-banner-text">Teşekkürler, bu talebi puanladın:</span>
                          <StarRating value={t.satisfactionRating} onRate={(r) => handleRate(t.id, r)} />
                        </>
                      ) : (
                        <>
                          <span className="rating-banner-text">Bu talep kapatıldı — deneyimini puanlar mısın?</span>
                          <StarRating value={t.satisfactionRating} onRate={(r) => handleRate(t.id, r)} />
                        </>
                      )}
                    </div>
                  )}

                  <div className="actions">
                    {isStaff && !t.assignedToUserId && (
                      <button className="btn btn-primary btn-sm" onClick={() => handleAssign(t.id)}>
                        Üstlen
                      </button>
                    )}
                    {isStaff && (
                      <select
                        className="select-status"
                        value={t.status}
                        onChange={(e) => handleStatusChange(t.id, e.target.value as TicketStatus)}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    )}
                    {!isStaff && t.status === 'Resolved' && (
                      <button className="btn btn-primary btn-sm" onClick={() => handleConfirmClose(t.id)}>
                        Onayla ve Kapat
                      </button>
                    )}
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setExpandedId(isExpanded ? null : t.id)}
                    >
                      {isExpanded ? 'Detayı Gizle' : `Detay (${t.commentCount} yorum, ${t.attachmentCount} ek)`}
                    </button>
                  </div>

                  {isExpanded && (
                    <TicketDetail
                      ticketId={t.id}
                      ticketTitle={t.title}
                      ticketDescription={t.description}
                      onCommentAdded={() => bumpCommentCount(t.id)}
                      onAttachmentAdded={() => bumpAttachmentCount(t.id)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
