import { LogOut, Moon, Sun, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useState, useEffect } from 'react';
import { logger } from '../utils/logger';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    logger.info('Navbar mounted', { file: 'src/components/Navbar.tsx', function: 'Navbar' });
  }, []);

  const handleToggle = () => {
    logger.info(`Theme toggle clicked (to ${dark ? 'light' : 'dark'})`, {
      file: 'src/components/Navbar.tsx', function: 'handleToggle',
    });
    toggle();
  };

  const handleLogout = () => {
    setOpen(false);
    logger.info('Logout button clicked', {
      file: 'src/components/Navbar.tsx', function: 'handleLogout', userId: user?.username,
    });
    logout();
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
          <span className="text-white font-bold text-sm">LF</span>
        </div>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">LoanFlow</h1>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={handleToggle} className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700">
          {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {user && (
          <div className="relative">
            <button onClick={() => setOpen(!open)} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
              <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block">{user.username}</span>
            </button>

            {open && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 z-20 py-1">
                  <div className="px-4 py-2 text-xs text-gray-400 uppercase tracking-wider">{user.role.replace('_', ' ')}</div>
                  <hr className="border-gray-200 dark:border-slate-700" />
                  <button onClick={handleLogout} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
