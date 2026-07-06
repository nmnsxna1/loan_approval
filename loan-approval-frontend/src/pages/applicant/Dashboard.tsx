import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { CardSkeleton, TableSkeleton } from '../../components/LoadingSkeleton';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import type { ApplicantDashboard as DashboardData } from '../../types';
import { FileText, Send, Clock, Calendar } from 'lucide-react';
import { logger, apiLogger } from '../../utils/logger';

export default function ApplicantDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    logger.info('ApplicantDashboard mounted', { file: 'src/pages/applicant/Dashboard.tsx', function: 'ApplicantDashboard' });
    api.get('/applications/dashboard').then((r) => {
      apiLogger.info('Applicant dashboard data loaded', { file: 'src/pages/applicant/Dashboard.tsx' });
      setData(r.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <CardSkeleton key={i} />)}
      </div>
      <TableSkeleton />
    </div>
  );

  const cards = [
    { label: 'Pending Drafts', value: data?.pendingDrafts ?? 0, icon: FileText, color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400' },
    { label: 'Submitted', value: data?.submittedApplications ?? 0, icon: Send, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400' },
    { label: 'Total Applications', value: data?.totalApplications ?? 0, icon: Clock, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400' },
    { label: 'Last Submitted', value: data?.lastSubmittedDate ? new Date(data.lastSubmittedDate).toLocaleDateString() : 'N/A', icon: Calendar, color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white px-6 py-4 border-b border-gray-100 dark:border-slate-700">Recent Activity</h2>
        {!data?.recentActivity?.length ? <EmptyState title="No recent activity" />
          : <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-700">
                  <th className="px-6 py-3 font-medium">App #</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Amount</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                </tr></thead>
                <tbody>
                  {data.recentActivity.map((app) => (
                    <tr key={app.id} className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                      <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">#{app.applicationNo}</td>
                      <td className="px-6 py-3"><StatusBadge status={app.status} /></td>
                      <td className="px-6 py-3 text-gray-700 dark:text-gray-300">₹{app.loanAmount?.toLocaleString() || '-'}</td>
                      <td className="px-6 py-3 text-gray-500">{new Date(app.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>
    </div>
  );
}
