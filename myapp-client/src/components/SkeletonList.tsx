// "Yükleniyor..." yazısı yerine, gelecek içeriğin şeklini taklit eden
// parlayan bloklar — bekleme süresi daha kısa hissettirir.
export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Yükleniyor">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton skeleton-row" />
      ))}
    </div>
  );
}
