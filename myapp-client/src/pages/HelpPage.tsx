import { useState } from 'react';
import { FAQ_ITEMS } from '../data';

export function HelpPage() {
  const [query, setQuery] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const filtered = FAQ_ITEMS.filter((item) => {
    if (!query.trim()) return true;
    const q = query.trim().toLocaleLowerCase('tr-TR');
    return (
      item.question.toLocaleLowerCase('tr-TR').includes(q) || item.answer.toLocaleLowerCase('tr-TR').includes(q)
    );
  });

  return (
    <>
      <div className="main-header">
        <div>
          <h1>Sık Sorulan Sorular</h1>
          <p className="sub">Talep açmadan önce burada bir çözüm bulabilirsin.</p>
        </div>
      </div>

      <div className="toolbar">
        <input
          type="text"
          placeholder="Soru ara..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-input"
          style={{ minWidth: 280 }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="glyph">∅</div>
          Bu aramayla eşleşen bir soru bulunamadı.
        </div>
      ) : (
        <div className="faq-list">
          {filtered.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={item.question} className={`faq-item${isOpen ? ' open' : ''}`}>
                <button className="faq-question" onClick={() => setOpenIndex(isOpen ? null : i)}>
                  <span>{item.question}</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="faq-chevron"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {isOpen && <p className="faq-answer">{item.answer}</p>}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
