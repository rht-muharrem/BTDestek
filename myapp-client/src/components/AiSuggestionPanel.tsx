import { useState } from 'react';
import { aiApi } from '../api';
import { AiSuggestion, CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS } from '../types';

interface Props {
  ticketTitle: string;
  ticketDescription: string;
}

export function AiSuggestionPanel({ ticketTitle, ticketDescription }: Props) {
  const [suggestion, setSuggestion] = useState<AiSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    try {
      const result = await aiApi.suggest(ticketTitle, ticketDescription);
      setSuggestion(result);
    } catch {
      setError('Analiz yapılamadı.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="detail-section">
      <p className="detail-heading">AI Destekli Analiz</p>

      {!suggestion && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={handleAnalyze} disabled={loading}>
          {loading ? 'Analiz ediliyor...' : '✨ AI ile Analiz Et'}
        </button>
      )}

      {error && <p className="error" style={{ marginTop: 8 }}>{error}</p>}

      {suggestion && (
        <div className="ai-panel" style={{ marginTop: 8 }}>
          <div className="ai-panel-head">
            <span className="ai-badge">✨ Öneri</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleAnalyze} disabled={loading}>
              {loading ? 'Yenileniyor...' : 'Tekrar Analiz Et'}
            </button>
          </div>

          <div className="ai-suggestion-grid">
            <div>
              <span className="spec-label">Kategori</span>
              <span className={`category-chip category-${suggestion.category}`}>
                {CATEGORY_LABELS[suggestion.category]}
              </span>
            </div>
            <div>
              <span className="spec-label">Alt Kategori</span>
              <span>{suggestion.subcategory}</span>
            </div>
            <div>
              <span className="spec-label">Önerilen Öncelik</span>
              <span className={`prio-tag prio-${suggestion.priority}`} style={{ background: 'var(--paper)' }}>
                {PRIORITY_LABELS[suggestion.priority]}
              </span>
            </div>
            <div>
              <span className="spec-label">Önerilen Ekip</span>
              <span>{suggestion.suggestedTeam}</span>
            </div>
          </div>

          {suggestion.reasoning && <p className="text-muted-sm ai-reasoning">{suggestion.reasoning}</p>}

          {suggestion.similarTickets.length > 0 && (
            <div className="ai-similar-tickets">
              <span className="spec-label">Benzer Geçmiş Talepler</span>
              <div className="ai-similar-list">
                {suggestion.similarTickets.map((t) => (
                  <span key={t.id} className="ai-similar-chip" title={t.title}>
                    #{t.id} · {STATUS_LABELS[t.status]}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
