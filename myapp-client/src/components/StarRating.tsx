import { useState } from 'react';

interface Props {
  value: number | null;
  onRate: (rating: number) => void;
}

export function StarRating({ value, onRate }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (value) {
    return (
      <span className="star-rating readonly" title={`${value}/5 puan verdin`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={n <= value ? 'star filled' : 'star'}>
            ★
          </span>
        ))}
      </span>
    );
  }

  return (
    <span className="star-rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={n <= (hovered ?? 0) ? 'star filled' : 'star'}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(null)}
          onClick={() => onRate(n)}
        >
          ★
        </span>
      ))}
    </span>
  );
}
