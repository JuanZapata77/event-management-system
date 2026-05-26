import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

function ManagerLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', password: '', otpCode: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username.trim().toLowerCase(),
          password: formData.password,
          otpCode: formData.otpCode,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to sign in');
      }

      if (!payload?.user || payload.user.role !== 'manager') {
        throw new Error('Only manager accounts can access this area');
      }

      localStorage.setItem('eventAuthUser', JSON.stringify(payload.user));
      localStorage.setItem('eventAuthToken', payload.token);
      navigate('/manager');
    } catch (submitError) {
      setError(submitError.message || 'Unexpected error while signing in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0f081d] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(115,17,212,0.45),_transparent_36%),radial-gradient(circle_at_bottom_right,_rgba(96,165,250,0.15),_transparent_32%),linear-gradient(135deg,_#0f081d_0%,_#1b102c_45%,_#12091f_100%)]" />
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:52px_52px]" />

      <div className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-6 py-14 lg:grid-cols-[1.05fr,0.95fr] lg:px-10">
        <section className="max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur">
            <span className="text-lg">🔐</span>
            Manager access
          </div>

          <h1 className="mt-6 text-5xl font-black tracking-tight text-white sm:text-6xl">
            Sign in to the control room.
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-8 text-white/72">
            Use your manager credentials to reach the dashboard, staffing tools, inventory, and payments in one place.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur">
              <p className="text-sm font-semibold text-white">Fast access</p>
              <p className="mt-1 text-sm leading-6 text-white/62">Jump directly into event planning and operations.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur">
              <p className="text-sm font-semibold text-white">2FA ready</p>
              <p className="mt-1 text-sm leading-6 text-white/62">Authenticator codes are supported when enabled.</p>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-white/95 p-6 text-slate-900 shadow-2xl shadow-black/35 backdrop-blur-xl sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#7311d4]">Manager login</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Welcome back</h2>
            </div>
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#7311d4]/10 text-2xl ring-1 ring-inset ring-[#7311d4]/15">
              👔
            </div>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">Username</span>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
                autoComplete="username"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#7311d4] focus:bg-white focus:ring-4 focus:ring-[#7311d4]/15"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">Password</span>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                autoComplete="current-password"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#7311d4] focus:bg-white focus:ring-4 focus:ring-[#7311d4]/15"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">Authenticator Code</span>
              <input
                type="text"
                name="otpCode"
                value={formData.otpCode}
                onChange={handleInputChange}
                autoComplete="one-time-code"
                inputMode="numeric"
                placeholder="123456"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#7311d4] focus:bg-white focus:ring-4 focus:ring-[#7311d4]/15"
              />
              <p className="text-xs leading-5 text-slate-500">Required once 2FA is enabled for the manager account.</p>
            </label>

            {error ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-[#7311d4] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#7311d4]/25 transition hover:-translate-y-0.5 hover:bg-[#6310b4] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign in to dashboard'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Back to role selection
          </button>
        </section>
      </div>
    </div>
  );
}

export default ManagerLogin;
