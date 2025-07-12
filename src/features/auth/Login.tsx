import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

const Login: React.FC = () => {
  const { login, loginWithGoogle, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      // Redirect or show success
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  const handleGoogle = async () => {
    setError(null);
    try {
      await loginWithGoogle();
      // Redirect or show success
    } catch (err: any) {
      setError(err.message || 'Google login failed');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white p-8 rounded shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
        {error && <div className="mb-4 text-red-500 text-sm">{error}</div>}
        <div className="mb-4">
          <label className="block mb-1 text-gray-700">Email</label>
          <input
            type="email"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="mb-6">
          <label className="block mb-1 text-gray-700">Password</label>
          <input
            type="password"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition mb-3"
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
        <button
          type="button"
          onClick={handleGoogle}
          className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600 transition mb-3"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Login with Google'}
        </button>
        <div className="text-center text-sm mt-4">
          Don't have an account? <a href="/signup" className="text-blue-600 hover:underline">Sign up</a>
        </div>
      </form>
    </div>
  );
};

export default Login;
