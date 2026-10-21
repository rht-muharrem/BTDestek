import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
}

// Dashboard'daki rakamlar 0'dan hedefe sayarak yükselir — sayfa açıldığında
// verinin "canlandığı" hissini verir.
export function CountUp({ value, duration = 900, decimals = 0, suffix = '' }: Props) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    // Kullanıcı hareketi azaltmayı tercih ettiyse doğrudan son değeri göster
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value);
      return;
    }

    const start = performance.now();
    const from = 0;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic: hızlı başlar, yumuşak durur
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (value - from) * eased);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    }

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration]);

  return (
    <>
      {display.toFixed(decimals)}
      {suffix}
    </>
  );
}
