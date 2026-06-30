import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Sun, Moon, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth }  from '../contexts/AuthContext';
import udsmLogo from '../assets/udsm.png';

function PasswordStrength({ password }) {
  const score = [/.{8,}/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(r => r.test(password)).length;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', 'bg-red-400', 'bg-amber-400', 'bg-yellow-400', 'bg-emerald-500'];
  if (!password) return null;
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= score ? colors[score] : 'bg-gray-200 dark:bg-zinc-700'}`} />
        ))}
      </div>
      <p className="text-[11px] text-zinc-500">{labels[score]}</p>
    </div>
  );
}

export default function RegisterPage() {
  const { dark, toggle }          = useTheme();
  const { isAuthenticated, register } = useAuth();
  const navigate                  = useNavigate();

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '' });
  const [showPwd, setShowPwd]     = useState(false);
  const [showCfm, setShowCfm]     = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  if (isAuthenticated) return <Navigate to="/chat" replace />;

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 8) {
      return setError('Password must be at least 8 characters.');
    }
    if (form.password !== form.confirm) {
      return setError('Passwords do not match.');
    }

    setLoading(true);
    try {
      await register({
        firstName: form.firstName.trim(),
        lastName:  form.lastName.trim(),
        email:     form.email.trim(),
        password:  form.password,
      });
      navigate('/chat', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:border-amber-500 dark:focus:border-amber-500 transition-colors';

  return (
    <div className="min-h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-950 px-4 py-12 relative">
      <button onClick={toggle}
        className="absolute top-4 right-4 p-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-white dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors">
        {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-gray-200 dark:border-zinc-800 p-8">
        <div className="flex flex-col items-center mb-8">
          <img src={udsmLogo} alt="UDSM" className="h-20 w-20 object-contain mb-4 drop-shadow-sm" />
          <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 text-center leading-tight">
            Create your account
          </h1>
          <p className="text-sm text-zinc-500 mt-1">UDSM Student Support Portal</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                First name
              </label>
              <input
                type="text"
                value={form.firstName}
                onChange={set('firstName')}
                placeholder="John"
                required
                autoComplete="given-name"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Last name
              </label>
              <input
                type="text"
                value={form.lastName}
                onChange={set('lastName')}
                placeholder="Doe"
                required
                autoComplete="family-name"
                className={inputClass}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Email address
            </label>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="yourname@udsm.ac.tz"
              required
              autoComplete="email"
              className={inputClass}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                placeholder="Min. 8 characters"
                required
                autoComplete="new-password"
                className={`${inputClass} pr-11`}
              />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <PasswordStrength password={form.password} />
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Confirm password
            </label>
            <div className="relative">
              <input
                type={showCfm ? 'text' : 'password'}
                value={form.confirm}
                onChange={set('confirm')}
                placeholder="••••••••"
                required
                autoComplete="new-password"
                className={`${inputClass} pr-11 ${form.confirm && form.confirm !== form.password ? 'border-red-400 dark:border-red-500' : ''}`}
              />
              <button type="button" onClick={() => setShowCfm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                {showCfm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {form.confirm && form.confirm !== form.password && (
              <p className="mt-1 text-[11px] text-red-500">Passwords do not match</p>
            )}
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-white font-semibold text-sm transition-all mt-1 disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-center text-zinc-500 dark:text-zinc-400 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-amber-500 dark:text-amber-400 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>

      <p className="text-[11px] text-zinc-400 dark:text-zinc-700 mt-6 text-center">
        University of Dar es Salaam &copy; {new Date().getFullYear()}
      </p>
    </div>
  );
}
