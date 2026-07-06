import { ReactNode, useEffect } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { logger } from '../utils/logger';

export default function Layout({ children }: { children: ReactNode }) {
  useEffect(() => {
    logger.info('Layout mounted', { file: 'src/components/Layout.tsx', function: 'Layout' });
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-slate-900">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
