import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, LogIn, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';
import { adminApiService } from '../../services/adminApiService';
import vedixaLogo from '../../assets/vedixa_logo.png';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Clear any previous stale/expired tokens when reaching login screen so no premature errors appear
  useEffect(() => {
    localStorage.removeItem('adminAccessToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('adminUser');
  }, []);

  const handleLogin = async (e) => {
    e?.preventDefault();
    setError('');

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const data = await adminApiService.adminLogin({
        username: 'admin.vedixa',
        password,
      });

      if (data?.user) {
        localStorage.setItem('adminUser', JSON.stringify(data.user));
      }

      setTimeout(() => {
        navigate('/admin/dashboard', { replace: true });
      }, 200);
    } catch (err) {
      const serverMsg = err.response?.data?.message || err.response?.data?.error;
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError(serverMsg || 'Invalid username or password');
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Unable to connect to the server. Please check your backend connection.');
      } else {
        setError(serverMsg || 'Login failed. Please check your credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 font-sans antialiased text-slate-800">
      {/* Login Card */}
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-8">
        
        {/* VEDIXA Logo & Title */}
        <div className="text-center mb-8">
          <img
            src={vedixaLogo}
            alt="VEDIXA"
            className="h-12 mx-auto mb-3 object-contain"
          />
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            VEDIXA Admin
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Sign in to access Admin Control Center
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-3 text-red-700 text-xs font-medium animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Password Field */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                id="admin-password-input"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                autoFocus
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-11 py-3 text-slate-900 text-sm font-medium focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-1 focus:ring-emerald-600 transition"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            id="admin-login-submit"
            disabled={loading || !password}
            className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold py-3.5 px-4 rounded-xl transition shadow-sm flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <LogIn className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security badge footer */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center space-x-2 text-slate-400 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Protected by Enterprise Security</span>
        </div>

      </div>
    </div>
  );
}
