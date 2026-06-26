import React, { useState } from 'react';
import { Sun, Moon, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import udsmLogo from '../assets/udsm.png';

export default function LoginPage({ onLogin }) {
  const { dark, toggle } = useTheme();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin();
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-950 px-4 py-12 relative">
      {/* Theme toggle */}
      <button onClick={toggle}
        className="absolute top-4 right-4 p-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-white dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors">
        {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Card */}
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-gray-200 dark:border-zinc-800 p-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src={udsmLogo} alt="UDSM" className="h-24 w-24 object-contain mb-4 drop-shadow-sm" />
          <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 text-center leading-tight">
            University of Dar es Salaam
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Student Support Portal</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="yourname@udsm.ac.tz"
              className="w-full rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:border-amber-500 dark:focus:border-amber-500 transition-colors"
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
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 pr-11 text-sm text-zinc-800 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:border-amber-500 dark:focus:border-amber-500 transition-colors"
              />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Forgot password link */}
          <div className="flex justify-end">
            <button type="button"
              className="text-xs text-amber-600 dark:text-amber-400 hover:underline">
              Forgot password?
            </button>
          </div>

          {/* Submit */}
          <button type="submit"
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-white font-semibold text-sm transition-all mt-1">
            Sign in
          </button>
        </form>

        <p className="text-[11px] text-center text-zinc-400 dark:text-zinc-600 mt-6">
          Having trouble?{' '}
          <a href="mailto:helpdesk@udsm.ac.tz"
            className="text-amber-500 dark:text-amber-400 hover:underline">
            Contact ICT Helpdesk
          </a>
        </p>
      </div>

      <p className="text-[11px] text-zinc-400 dark:text-zinc-700 mt-6 text-center">
        University of Dar es Salaam &copy; {new Date().getFullYear()}
      </p>
    </div>
  );
}
