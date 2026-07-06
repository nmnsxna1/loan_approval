import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, User, Lock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { logger, authLogger } from '../utils/logger';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    logger.info('Login page mounted', { file: 'src/pages/Login.tsx', function: 'Login' });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    authLogger.info('Login form submitted', {
      file: 'src/pages/Login.tsx', function: 'handleSubmit', url: '/login',
    });
    try {
      const role = await login(username, password);
      const paths: Record<string, string> = { APPLICANT: '/applicant', POLICY_MANAGER: '/policy-manager', MAIN_MANAGER: '/main-manager' };
      toast.success(`Welcome, ${username}!`);
      navigate(paths[role] || '/');
    } catch (err: any) {
      authLogger.warn('Login form submission failed', {
        file: 'src/pages/Login.tsx', function: 'handleSubmit',
        message: err.response?.data?.message || 'Invalid credentials',
      });
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 via-primary-700 to-slate-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">LF</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome to LoanFlow</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">AI-Powered Loan Approval System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input id="password" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full pl-10 pr-12 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white font-medium hover:from-primary-700 hover:to-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50">
            {loading ? 'Signing in...' : 'Sign In'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 p-3 rounded-xl bg-gray-50 dark:bg-slate-700/50 text-xs text-gray-500 dark:text-gray-400">
          <p className="font-medium mb-1">Demo Credentials:</p>
          <p>applicant / policy_manager / main_manager — Password: 123456</p>
        </div>
      </div>
    </div>
  );
}
