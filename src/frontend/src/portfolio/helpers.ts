import { Cloud, Database, MonitorSmartphone, Server, Sparkles, type LucideIcon } from 'lucide-react';

/** Picks an icon for a skill group from its title; unknown titles get a neutral one. */
export function iconForGroup(title: string): LucideIcon {
  const text = title.toLowerCase();
  if (/(back|server|api|\.net|java)/.test(text)) return Server;
  if (/(front|\bui\b|\bux\b|web|mobile|design)/.test(text)) return MonitorSmartphone;
  if (/(dat[ia]|sql|db|database)/.test(text)) return Database;
  if (/(cloud|devops|azure|aws|infra|ci\/cd)/.test(text)) return Cloud;
  return Sparkles;
}

/** "Mario Rossi" → "MR"; one word → its first two letters; empty → "?". */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function isExternal(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/** Each project/skill card gets one of these gradients, cycling. */
export const cardGradients = [
  'from-brand-600 to-accent-400',
  'from-violet-600 to-fuchsia-500',
  'from-emerald-500 to-cyan-400',
  'from-orange-500 to-rose-500'
] as const;
