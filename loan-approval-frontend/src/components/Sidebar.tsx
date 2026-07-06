import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, FilePlus, Files, ClipboardCheck, Search, AlertTriangle, BarChart3, History } from 'lucide-react';
import { logger } from '../utils/logger';

const menus: Record<string, { label: string; icon: any; path: string }[]> = {
  APPLICANT: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/applicant' },
    { label: 'New Application', icon: FilePlus, path: '/applicant/new' },
    { label: 'My Applications', icon: Files, path: '/applicant/applications' },
  ],
  POLICY_MANAGER: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/policy-manager' },
    { label: 'Review Applications', icon: ClipboardCheck, path: '/policy-manager/review' },
    { label: 'Search Applications', icon: Search, path: '/policy-manager/search' },
  ],
  MAIN_MANAGER: [
    { label: 'Dashboard', icon: BarChart3, path: '/main-manager' },
    { label: 'Escalated Cases', icon: AlertTriangle, path: '/main-manager/escalated' },
    { label: 'Search Applications', icon: Search, path: '/main-manager/search' },
  ],
};

export default function Sidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const items = menus[user?.role || ''] || [];

  const handleNav = (path: string, label: string) => {
    logger.info(`Sidebar navigation: ${label} -> ${path}`, {
      file: 'src/components/Sidebar.tsx',
      function: 'handleNav',
      url: path,
      userId: user?.username,
    });
    navigate(path);
  };

  return (
    <aside className="w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col">
      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => handleNav(item.path, item.label)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              <item.icon className={`w-5 h-5 ${active ? 'text-primary-600 dark:text-primary-400' : ''}`} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
