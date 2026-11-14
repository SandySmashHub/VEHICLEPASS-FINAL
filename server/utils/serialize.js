// Plain, socket-safe vehicle object without internal fields.
export function publicVehicle(v) {
  const o = JSON.parse(JSON.stringify(typeof v.toObject === 'function' ? v.toObject() : v));
  delete o.geofenceState;
  delete o.__v;
  return o;
}

export const str = (v) => (typeof v === 'string' && v.length ? v : undefined);
export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Converts date-only or ISO strings from the client to a Mongo range. tzOffset = Date#getTimezoneOffset() of the client. */
export function dateRange(from, to, tzOffset = 0) {
  const parse = (s, endOfDay) => {
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const ms = Date.parse(`${s}T00:00:00Z`) + tzOffset * 60000 + (endOfDay ? 86400000 : 0);
      return new Date(ms);
    }
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const start = parse(from, false);
  const end = parse(to, true);
  const range = {};
  if (start) range.$gte = start;
  if (end) range.$lt = end;
  return Object.keys(range).length ? range : null;
}
