import { useEffect } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';

export const Spinner = ({ className = 'h-5 w-5' }) => <Loader2 className={`animate-spin text-brand-600 ${className}`} aria-hidden />;

export const PageLoader = ({ label = 'Loading…' }) => (
  <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500" role="status">
    <Spinner /> {label}
  </div>
);

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && <button onClick={onRetry} className="font-semibold underline">Retry</button>}
    </div>
  );
}

export const SuccessBanner = ({ message }) =>
  message ? <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800" role="status">{message}</div> : null;

export const WarnBanner = ({ message, children }) =>
  message || children ? <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">{message}{children}</div> : null;

const BADGES = {
  INSIDE: 'bg-brand-100 text-brand-800',
  OUTSIDE: 'bg-slate-100 text-slate-700',
  ACTIVE: 'bg-brand-100 text-brand-800',
  COMPLETED: 'bg-slate-100 text-slate-700',
  ENTRY: 'bg-brand-100 text-brand-800',
  EXIT: 'bg-slate-100 text-slate-700',
  ENTER: 'bg-brand-100 text-brand-800',
  OVERSTAY: 'bg-red-100 text-red-800',
  GEOFENCE_EXIT: 'bg-amber-100 text-amber-900',
  GEOFENCE_ENTER: 'bg-sky-100 text-sky-800',
  ADMIN: 'bg-brand-800 text-white',
  GUARD: 'bg-slate-200 text-slate-800',
  OPEN: 'bg-red-100 text-red-800',
  RESOLVED: 'bg-slate-100 text-slate-600',
  DISABLED: 'bg-slate-200 text-slate-600',
};
const LABELS = { GEOFENCE_EXIT: 'Left geofence', GEOFENCE_ENTER: 'Entered geofence', OVERSTAY: 'Overstay' };

export const Badge = ({ value, label }) => (
  <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGES[value] || 'bg-slate-100 text-slate-700'}`}>
    {label || LABELS[value] || value.charAt(0) + value.slice(1).toLowerCase()}
  </span>
);

export const SimBadge = ({ text = 'Simulated demo data' }) => (
  <span className="inline-block whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">{text}</span>
);

export const PageHeader = ({ title, subtitle, children }) => (
  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-brand-950">{title}</h1>
      {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
    </div>
    <div className="flex flex-wrap items-center gap-2">{children}</div>
  </div>
);

export const EmptyState = ({ title, hint }) => (
  <div className="px-6 py-12 text-center">
    <p className="font-semibold text-slate-700">{title}</p>
    {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
  </div>
);

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-brand-950">{title}</h2>
          <button onClick={onClose} className="btn-ghost" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Pager({ page, pages, total, onPage }) {
  if (!total) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
      <span>{total} record{total === 1 ? '' : 's'}</span>
      <div className="flex items-center gap-2">
        <button className="btn-secondary px-2 py-1" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
        <span>Page {page} of {pages}</span>
        <button className="btn-secondary px-2 py-1" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

export const Field = ({ label, children }) => (
  <label className="block">
    <span className="label">{label}</span>
    {children}
  </label>
);
