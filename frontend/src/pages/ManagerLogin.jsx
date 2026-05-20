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
      navigate('/manager');
    } catch (submitError) {
      setError(submitError.message || 'Unexpected error while signing in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#7311d4] to-purple-900 flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Manager Login</h1>
        <p className="text-gray-600 mb-6">Sign in with your manager credentials.</p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Username</span>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              required
              autoComplete="username"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7311d4]"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Password</span>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7311d4]"
            />
          </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">Authenticator Code</span>
              <input
                type="text"
                name="otpCode"
                value={formData.otpCode}
                onChange={handleInputChange}
                autoComplete="one-time-code"
                inputMode="numeric"
                placeholder="123456"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7311d4]"
              />
              <p className="mt-1 text-xs text-gray-500">Required once 2FA is enabled for the manager account.</p>
            </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#7311d4] py-2.5 font-semibold text-white hover:bg-[#7311d4]/90 disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-4 w-full rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to role selection
        </button>
      </div>
    </div>
  );
}

export default ManagerLogin;
