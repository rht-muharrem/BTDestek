interface Props {
  name: string;
  size?: number;
  title?: string;
}

const PALETTES: [string, string][] = [
  ['#5b7cf7', '#8b5cf6'],
  ['#0ea5a4', '#22c55e'],
  ['#f97316', '#f43f5e'],
  ['#8b5cf6', '#ec4899'],
  ['#0284c7', '#06b6d4'],
  ['#d97706', '#eab308'],
  ['#dc2626', '#f97316'],
  ['#16a34a', '#65a30d'],
  ['#7c3aed', '#4f46e5'],
  ['#db2777', '#8b5cf6'],
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toLocaleUpperCase('tr-TR');
  return (
    parts[0].charAt(0).toLocaleUpperCase('tr-TR') +
    parts[parts.length - 1].charAt(0).toLocaleUpperCase('tr-TR')
  );
}

export function Avatar({ name, size = 30, title }: Props) {
  const [from, to] = PALETTES[hashName(name) % PALETTES.length];

  return (
    <span
      className="gradient-avatar"
      title={title ?? name}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${from}, ${to})`,
        fontSize: Math.max(10, Math.round(size * 0.38)),
      }}
    >
      {getInitials(name)}
    </span>
  );
}
