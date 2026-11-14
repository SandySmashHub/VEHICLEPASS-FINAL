import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import api, { errMsg } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Badge, ErrorBanner, Field, Modal, PageHeader, PageLoader, Spinner } from '../components/ui.jsx';
import { fmtDateTime } from '../utils/format.js';

function UserForm({ user, onSaved, onCancel }) {
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', password: '', role: user?.role || 'GUARD', active: user?.active ?? true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (user) await api.put(`/users/${user._id}`, { ...form, password: form.password || undefined });
      else await api.post('/users', { name: form.name, email: form.email, password: form.password, role: form.role });
      onSaved();
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <ErrorBanner message={error} />
      <Field label="Full name"><input className="input" required minLength={2} value={form.name} onChange={set('name')} /></Field>
      <Field label="Email"><input type="email" className="input" required value={form.email} onChange={set('email')} /></Field>
      <Field label={user ? 'New password (leave blank to keep)' : 'Password (min 8 characters)'}><input type="password" className="input" minLength={8} required={!user} autoComplete="new-password" value={form.password} onChange={set('password')} /></Field>
      <Field label="Role"><select className="input" value={form.role} onChange={set('role')}><option value="GUARD">Security guard</option><option value="ADMIN">Admin</option></select></Field>
      {user && <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" className="h-4 w-4 accent-brand-700" checked={form.active} onChange={set('active')} /> Account active</label>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4 !text-white" />} {user ? 'Save changes' : 'Create user'}</button>
      </div>
    </form>
  );
}

export default function Users() {
  const { user: me } = useAuth();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    try { setItems((await api.get('/users')).data.items); setError(''); } catch (e) { setError(errMsg(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function remove(u) {
    if (!window.confirm(`Delete ${u.name}?`)) return;
    try { await api.delete(`/users/${u._id}`); load(); } catch (e) { setError(errMsg(e)); }
  }

  return (
    <>
      <PageHeader title="Users" subtitle="Admins and security guards who can sign in">
        <button className="btn-primary" onClick={() => setEditing({})}><Plus className="h-4 w-4" /> Add user</button>
      </PageHeader>
      <ErrorBanner message={error} onRetry={load} />
      <div className="card mt-4 overflow-hidden">
        {!items ? <PageLoader /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50"><tr><th className="th">Name</th><th className="th">Email</th><th className="th">Role</th><th className="th">Status</th><th className="th">Last sign-in</th><th className="th" /></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((u) => (
                  <tr key={u._id}>
                    <td className="td font-semibold">{u.name}{u._id === me._id && <span className="ml-2 text-xs font-normal text-slate-500">(you)</span>}</td>
                    <td className="td">{u.email}</td>
                    <td className="td"><Badge value={u.role} label={u.role === 'ADMIN' ? 'Admin' : 'Security guard'} /></td>
                    <td className="td"><Badge value={u.active ? 'ACTIVE' : 'DISABLED'} label={u.active ? 'Active' : 'Disabled'} /></td>
                    <td className="td">{fmtDateTime(u.lastLoginAt)}</td>
                    <td className="td"><div className="flex justify-end gap-1">
                      <button className="btn-ghost" onClick={() => setEditing(u)} aria-label={`Edit ${u.name}`}><Pencil className="h-4 w-4" /></button>
                      {u._id !== me._id && <button className="btn-ghost text-red-600 hover:bg-red-50" onClick={() => remove(u)} aria-label={`Delete ${u.name}`}><Trash2 className="h-4 w-4" /></button>}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editing && <Modal title={editing._id ? `Edit ${editing.name}` : 'Add user'} onClose={() => setEditing(null)}><UserForm user={editing._id ? editing : null} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} /></Modal>}
    </>
  );
}
