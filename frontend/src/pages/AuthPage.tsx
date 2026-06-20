import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCanvasFingerprint } from '../utils/fingerprint';

function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const clientFingerprint = await getCanvasFingerprint();
      const url = `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/auth/${isLogin ? 'login' : 'register'}`;

      const body = isLogin
        ? { email, password, clientFingerprint }
        : { username, email, password, clientFingerprint };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Operation failed');
      }

      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('user_id', data.user.id);

      navigate('/');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-discord-bg">
      <div className="w-full max-w-md rounded-lg border border-gray-700 bg-discord-sidebar p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
          <p className="mt-2 text-discord-muted">{isLogin ? 'Sign in to continue chatting' : 'Join the conversation today'}</p>
        </div>

        {error && <div className="mb-4 rounded border border-red-500 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="mb-1 block text-sm font-medium text-discord-text">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={2}
                maxLength={32}
                className="w-full rounded border border-gray-600 bg-discord-bg px-4 py-2 outline-none transition-colors focus:border-discord-accent"
                placeholder="Choose a username"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-discord-text">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded border border-gray-600 bg-discord-bg px-4 py-2 outline-none transition-colors focus:border-discord-accent"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-discord-text">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded border border-gray-600 bg-discord-bg px-4 py-2 outline-none transition-colors focus:border-discord-accent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded bg-discord-accent py-2 font-medium transition-colors hover:bg-purple-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Please wait…' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-discord-muted">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="font-medium text-discord-accent hover:underline"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
