// Escapes a cell and neutralises spreadsheet formula injection (=, +, -, @) in text values.
const esc = (v) => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return String(v);
  let s = v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const toCsv = (columns, rows) =>
  [columns.map((c) => esc(c.label)).join(','), ...rows.map((r) => columns.map((c) => esc(r[c.key])).join(','))].join('\r\n');
