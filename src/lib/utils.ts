import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getExamsAllowed = (plan?: '7-day' | '15-day' | '30-day' | 'permanent' | 'trial' | null): number => {
  switch (plan) {
    case '7-day': return 1;
    case '15-day': return 2;
    case '30-day': return 4;
    case 'permanent': return Infinity;
    case 'trial': return 1;
    default: return 0;
  }
};

export const getDeviceId = (): string => {
  if (typeof window === 'undefined') return '';
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
};

export function safeToDate(date: any): Date | null {
  if (!date) return null;
  if (typeof date.toDate === 'function') return date.toDate();
  if (date instanceof Date) return date;
  if (date.seconds) return new Date(date.seconds * 1000);
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function getReactivoNumber(title: string): number {
  // Primero buscar "Reactivo" seguido de cualquier cosa y luego números (ej: "Reactivo 5", "Reactivo #5", "Reactivo: 5")
  const match = title.match(/Reactivo\D*(\d+)/i);
  if (match) return parseInt(match[1], 10);

  // Si no dice "Reactivo", simplemente buscar cualquier número en el título
  const genericMatch = title.match(/(\d+)/);
  return genericMatch ? parseInt(genericMatch[1], 10) : -1;
}

export function sortContentItems<T extends { title: string; order?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    // 1. Prioridad: Campo 'order' manual
    const orderA = a.order ?? Infinity;
    const orderB = b.order ?? Infinity;

    if (orderA !== orderB) {
      if (orderA === Infinity) return 1;
      if (orderB === Infinity) return -1;
      return orderA - orderB;
    }

    // 2. Si no hay 'order' o son iguales, intentar por número de reactivo en título
    const numA = getReactivoNumber(a.title);
    const numB = getReactivoNumber(b.title);

    if (numA !== -1 && numB !== -1) return numA - numB;
    if (numA !== -1) return -1;
    if (numB !== -1) return 1;

    // 3. Fallback: Orden alfabético
    return a.title.localeCompare(b.title);
  });
}

export function getSpotifyEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  // Spotify URL match formats:
  // https://open.spotify.com/episode/7makk4oLZL46vVI97qZbuB (standard)
  // spotify:episode:7makk4oLZL46vVI97qZbuB (uri)

  const episodeMatch = url.match(/spotify:episode:([a-zA-Z0-9]+)/) ||
    url.match(/open\.spotify\.com\/episode\/([a-zA-Z0-9]+)/);

  if (episodeMatch && episodeMatch[1]) {
    return `https://open.spotify.com/embed/episode/${episodeMatch[1]}?utm_source=generator`;
  }

  return null;
}

