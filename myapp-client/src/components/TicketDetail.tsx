import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { ticketsApi } from '../api';
import { useAuth } from '../AuthContext';
import { useRealtime } from '../RealtimeContext';
import { TicketAttachment, TicketComment } from '../types';
import { CANNED_RESPONSES } from '../data';
import { AiSuggestionPanel } from './AiSuggestionPanel';
import { Avatar } from './Avatar';

interface Props {
  ticketId: number;
  ticketTitle: string;
  ticketDescription: string;
  onCommentAdded: () => void;
  onAttachmentAdded: () => void;
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function TicketDetail({ ticketId, ticketTitle, ticketDescription, onCommentAdded, onAttachmentAdded }: Props) {
  const { user } = useAuth();
  const isStaff = user?.role === 'ITStaff';
  const { connection } = useRealtime();

  const [comments, setComments] = useState<TicketComment[]>([]);
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [liveFlashId, setLiveFlashId] = useState<number | null>(null);
  const handledCommentIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  // Gerçek zamanlı: bu talebi açık tutan herkes, biri yorum yazdığı anda
  // sayfayı yenilemeden görür — "Muharrem yeni yorum yaptı" anlık gelir.
  useEffect(() => {
    if (!connection) return;

    connection.invoke('JoinTicket', ticketId).catch(() => {});

    function handleNewComment(comment: TicketComment) {
      if (comment.ticketId !== ticketId) return;

      // StrictMode geliştirme modunda setState updater'ını bilerek 2 kez çalıştırır —
      // bu yüzden bildirim/sayaç gibi yan etkileri updater'ın DIŞINDA, ref tabanlı bir
      // "bu yorumu zaten işledim mi" kontrolüyle bir kez tetikliyoruz.
      if (handledCommentIdsRef.current.has(comment.id)) return;
      handledCommentIdsRef.current.add(comment.id);

      setComments((prev) => (prev.some((c) => c.id === comment.id) ? prev : [...prev, comment]));
      onCommentAdded();
      // Not: Masaüstü bildirimi burada GÖNDERİLMİYOR — aynı yorum için zaten
      // NotificationBell.tsx (NewNotification olayı) üzerinden bildirim gidiyor.
      // İkisi birden çalışırsa aynı yorum için 2 ayrı masaüstü bildirimi çıkıyordu.
      setLiveFlashId(comment.id);
      setTimeout(() => setLiveFlashId(null), 2000);
    }

    connection.on('NewComment', handleNewComment);

    return () => {
      connection.invoke('LeaveTicket', ticketId).catch(() => {});
      connection.off('NewComment', handleNewComment);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection, ticketId]);

  async function load() {
    setLoading(true);
    const [c, a] = await Promise.all([ticketsApi.getComments(ticketId), ticketsApi.getAttachments(ticketId)]);
    setComments(c);
    setAttachments(a);
    setLoading(false);
  }

  async function handleAddComment(e: FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      const created = await ticketsApi.addComment(ticketId, message.trim());
      // SignalR "yankısı" bazen bu HTTP yanıtından ÖNCE gelebilir (yarış durumu) —
      // o yüzden zaten işlenmişse (ref'te varsa) burada tekrar eklemiyoruz/saymıyoruz.
      if (!handledCommentIdsRef.current.has(created.id)) {
        handledCommentIdsRef.current.add(created.id);
        setComments((prev) => (prev.some((c) => c.id === created.id) ? prev : [...prev, created]));
        onCommentAdded();
      }
      setMessage('');
    } finally {
      setSending(false);
    }
  }

  async function uploadFile(file: File) {
    setFileError(null);
    if (file.size > 3 * 1024 * 1024) {
      setFileError('Dosya çok büyük (maksimum 3MB).');
      return;
    }
    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const created = await ticketsApi.addAttachment(ticketId, file.name, file.type || 'application/octet-stream', base64);
      setAttachments((prev) => [...prev, created]);
      onAttachmentAdded();
    } catch {
      setFileError('Dosya yüklenemedi.');
    } finally {
      setUploading(false);
    }
  }

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  return (
    <div className="ticket-detail">
      {/* AI Destekli Analiz - sadece IT personeli görür */}
      {isStaff && <AiSuggestionPanel ticketTitle={ticketTitle} ticketDescription={ticketDescription} />}

      {/* Dosya Ekleri */}
      <div className="detail-section">
        <p className="detail-heading">Dosya Ekleri</p>
        {attachments.length > 0 && (
          <div className="attachment-list">
            {attachments.map((a) => (
              <a
                key={a.id}
                className="attachment-chip"
                href={`data:${a.contentType};base64,${a.dataBase64}`}
                download={a.fileName}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3 3 0 0 1 4.24 4.24l-9.2 9.19a1 1 0 0 1-1.41-1.41l8.49-8.48" />
                </svg>
                {a.fileName}
              </a>
            ))}
          </div>
        )}
        <div
          className={`dropzone${isDraggingOver ? ' dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={handleDrop}
        >
          <label className="file-input-label">
            {uploading ? 'Yükleniyor...' : '+ Dosya seç veya buraya sürükle-bırak'}
            <input type="file" onChange={handleFileSelect} disabled={uploading} accept="image/*,.pdf,.txt,.log" />
          </label>
        </div>
        {fileError && (
          <p className="error" style={{ marginTop: 8 }}>
            {fileError}
          </p>
        )}
      </div>

      {/* Yorumlar */}
      <div className="detail-section">
        <p className="detail-heading">Yorumlar</p>
        {loading ? (
          <p className="text-muted-sm">Yükleniyor...</p>
        ) : comments.length === 0 ? (
          <p className="text-muted-sm">Henüz yorum yok.</p>
        ) : (
          <div className="comment-thread">
            {comments.map((c) => (
              <div
                key={c.id}
                className={`comment-bubble ${c.authorRole === 'ITStaff' ? 'from-staff' : 'from-user'}${liveFlashId === c.id ? ' flash-new-comment' : ''}`}
              >
                <div className="comment-meta">
                  <Avatar name={c.authorName} size={20} />
                  <span className="comment-author">{c.authorName}</span>
                  <span className="comment-date">{fmtDateTime(c.createdAt)}</span>
                </div>
                <p>{c.message}</p>
              </div>
            ))}
          </div>
        )}

        {isStaff && (
          <div className="canned-response-row">
            {CANNED_RESPONSES.map((resp) => (
              <button key={resp} type="button" className="canned-chip" onClick={() => setMessage(resp)}>
                {resp.length > 28 ? resp.slice(0, 28) + '…' : resp}
              </button>
            ))}
          </div>
        )}

        <form className="comment-form" onSubmit={handleAddComment}>
          <input
            type="text"
            placeholder="Bir yorum yaz..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-sm" disabled={sending}>
            Gönder
          </button>
        </form>
      </div>
    </div>
  );
}
