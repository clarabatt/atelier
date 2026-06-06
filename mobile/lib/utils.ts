export function domainEmoji(domain: string): string {
  const map: Record<string, string> = {
    french: '🇫🇷',
    spanish: '🇪🇸',
    english: '🇬🇧',
    history: '🏛️',
    science: '🔬',
    math: '📐',
    maths: '📐',
    music: '🎵',
    art: '🎨',
    geography: '🌍',
    biology: '🧬',
    chemistry: '⚗️',
    physics: '⚡',
    literature: '📖',
  };
  return map[domain.toLowerCase()] ?? '📝';
}

export function formatDate(iso: string | null): string {
  if (!iso) return 'No activity yet';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
