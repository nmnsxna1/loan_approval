import { useEffect, useState } from 'react';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';
import SearchBar from '../../components/SearchBar';
import Pagination from '../../components/Pagination';
import { TableSkeleton } from '../../components/LoadingSkeleton';
import EmptyState from '../../components/EmptyState';
import { useDebounce } from '../../hooks/useDebounce';
import type { Application } from '../../types';
import { logger, apiLogger, errorLogger } from '../../utils/logger';
import toast from 'react-hot-toast';

export default function PolicySearch() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    logger.info('PolicySearch page mounted', { file: 'src/pages/policy-manager/SearchApplications.tsx', function: 'PolicySearch' });
  }, []);

  useEffect(() => { if (page !== 1) setPage(1) }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    api.get('/applications', { params: { search: debouncedSearch, status: statusFilter, page, limit: 10 }, signal: controller.signal })
      .then((r) => {
        apiLogger.info(`Policy search results: ${r.data.data.length} apps (page ${page})`, { file: 'src/pages/policy-manager/SearchApplications.tsx' });
        setApps(r.data.data); setTotalPages(r.data.pagination.totalPages || 1);
      })
      .catch((err) => {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
          errorLogger.error('Policy search failed', { file: 'src/pages/policy-manager/SearchApplications.tsx', message: err.message });
          toast.error('Failed to load applications');
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [debouncedSearch, statusFilter, page]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Search Applications</h1>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]"><SearchBar value={search} onChange={setSearch} placeholder="Search by application # or name..." /></div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="ALL">All</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="ESCALATED">Escalated</option>
        </select>
      </div>

      {loading ? <TableSkeleton /> : apps.length === 0 ? <EmptyState title="No results" /> : (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-700">
                <th className="px-6 py-3 font-medium">App #</th>
                <th className="px-6 py-3 font-medium">Applicant</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Amount</th>
                <th className="px-6 py-3 font-medium">Risk Score</th>
                <th className="px-6 py-3 font-medium">Date</th>
              </tr></thead>
              <tbody>
                {apps.map((app) => (
                  <tr key={app.id} className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">#{app.applicationNo}</td>
                    <td className="px-6 py-3 text-gray-700 dark:text-gray-300">{app.applicantName || '-'}</td>
                    <td className="px-6 py-3"><StatusBadge status={app.status} /></td>
                    <td className="px-6 py-3 text-gray-700 dark:text-gray-300">₹{app.loanAmount?.toLocaleString() || '-'}</td>
                    <td className="px-6 py-3">{app.riskAssessment?.riskScore ?? '-'}</td>
                    <td className="px-6 py-3 text-gray-500">{new Date(app.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
