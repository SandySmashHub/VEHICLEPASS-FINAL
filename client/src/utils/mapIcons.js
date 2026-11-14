import L from 'leaflet';
import { STALE_AFTER_MS } from './constants.js';

const cache = new Map();

export function vehicleColor(v) {
  if (v.overstay) return '#dc2626';
  return v.status === 'INSIDE' ? '#16a34a' : '#64748b';
}

export const isStale = (v) => !v.location?.isSimulated && v.location?.updatedAt && Date.now() - new Date(v.location.updatedAt).getTime() > STALE_AFTER_MS;

export function vehicleIcon(v, selected = false) {
  const color = vehicleColor(v);
  const stale = isStale(v);
  const key = `${v.regNumber}|${color}|${selected}|${stale}`;
  if (!cache.has(key)) {
    cache.set(key, L.divIcon({
      className: '',
      html: `<div class="vp-pin${selected ? ' sel' : ''}${stale ? ' stale' : ''}" style="--c:${color}"><b>${v.regNumber}</b><i></i></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
      popupAnchor: [0, -12],
    }));
  }
  return cache.get(key);
}

export const dotIcon = (color) => {
  const key = `dot|${color}`;
  if (!cache.has(key)) cache.set(key, L.divIcon({ className: '', html: `<div class="vp-dot" style="--c:${color}"></div>`, iconSize: [14, 14], iconAnchor: [7, 7] }));
  return cache.get(key);
};
