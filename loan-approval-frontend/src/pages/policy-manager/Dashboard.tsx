import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { CardSkeleton } from '../../components/LoadingSkeleton';
import type { PolicyDashboard } from '../../types';
import { Clock, CheckCircle2, XCircle, AlertTriangle, Eye } from 'lucide-react';
import { logger, apiLogger, errorLogger } from '../../utils/logger';
import toast from 'react-hot-toast';

export default function PolicyManagerDashboard() {
  const [data, setData] = useState<PolicyDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    logger.info('PolicyManagerDashboard mounted', { file: 'src/pages/policy-manager/Dashboard.tsx', function: 'PolicyManagerDashboard' });
    api.get('/applications/dashboard', { signal: controller.signal }).then((r) => {
      apiLogger.info('Policy dashboard data loaded', { file: 'src/pages/policy-manager/Dashboard.tsx' });
      setData(r.data);
    }).catch((err) => {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        errorLogger.error('Policy dashboard failed', { file: 'src/pages/policy-manager/Dashboard.tsx', message: err.message });
        toast.error('Failed to load dashboard');
      }
    }).finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Policy Manager Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4,5].map(i => <CardSkeleton key={i} />)}
      </div>
    </div>
  );

  const cards = [
    { label: 'Pending Applications', value: data?.pendingApplications ?? 0, icon: Clock, color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400' },
    { label: 'Reviewed Today', value: data?.reviewedToday ?? 0, icon: Eye, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400' },
    { label: 'Escalated Cases', value: data?.escalatedCases ?? 0, icon: AlertTriangle, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400' },
    { label: 'Approved Cases', value: data?.approvedCases ?? 0, icon: CheckCircle2, color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400' },
    { label: 'Rejected Cases', value: data?.rejectedCases ?? 0, icon: XCircle, color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Policy Manager Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">{c.label}</span>
              <div className={`p-2 rounded-lg ${c.color}`}><c.icon className="w-4 h-4" /></div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
