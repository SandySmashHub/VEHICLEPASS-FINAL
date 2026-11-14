import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errMsg } from '../services/api.js';
import { Logo } from '../layouts/AppLayout.jsx';
import { ErrorBanner, Spinner } from '../components/ui.jsx';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={location.state?.from?.pathname || '/'} replace />;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="hidden flex-col justify-between bg-brand-900 p-12 text-white lg:flex">
        <Logo dark />
        <div>
          <h2 className="max-w-md text-4xl font-extrabold leading-tight tracking-tight">Know which vehicles are on site, and where they are.</h2>
          <p className="mt-4 max-w-md text-brand-200">Log entries and exits at the gate, follow tracked vehicles on a live map and get alerted when a vehicle overstays or leaves the boundary.</p>
        </div>
        <p className="text-sm text-brand-300">Location tracking runs only while a signed-in user keeps the tracking page open and allows location access.</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div className="lg:hidden"><Logo /></div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-brand-950">Sign in</h1>
            <p className="mt-1 text-sm text-slate-500">Use the account an administrator created for you.</p>
          </div>
          <ErrorBanner message={error} />
          <label className="block"><span className="label">Email</span><input className="input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="block"><span className="label">Password</span><input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          <button className="btn-primary w-full py-2.5" disabled={busy}>{busy && <Spinner className="h-4 w-4 !text-white" />} Sign in</button>
        </form>
      </div>
    </div>
  );
}
