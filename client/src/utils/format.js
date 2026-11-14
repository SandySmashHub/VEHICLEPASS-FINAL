export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—');
export const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString([], { timeStyle: 'medium' }) : '—');
export const fmtCoord = (n) => (n === null || n === undefined ? '—' : Number(n).toFixed(5));
export const fmtKm = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);

export function fmtDuration(min) {
  if (min === null || min === undefined) return '—';
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  return h ? `${h}h ${m % 60}m` : `${m}m`;
}

export const minutesSince = (d, now = Date.now()) => Math.floor((now - new Date(d).getTime()) / 60000);

export function timeAgo(d, now = Date.now()) {
  if (!d) return 'never';
  const s = Math.max(0, Math.floor((now - new Date(d).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const pad = (n) => String(n).padStart(2, '0');
export const toLocalInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const toDateInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const normalizeReg = (s) => s.replace(/[\s-]/g, '').toUpperCase();
