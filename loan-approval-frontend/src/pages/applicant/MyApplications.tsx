import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import StatusBadge from '../../components/StatusBadge';
import SearchBar from '../../components/SearchBar';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import { TableSkeleton } from '../../components/LoadingSkeleton';
import type { Application } from '../../types';
import { useDebounce } from '../../hooks/useDebounce';
import { Eye, Pencil, Trash2, XCircle } from 'lucide-react';
import ConfirmDialog from '../../components/ConfirmDialog';
import { logger, apiLogger, errorLogger } from '../../utils/logger';

export default function MyApplications() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const debouncedSearch = useDebounce(search, 400);
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState<{ action: string; id: string; appNo?: number } | null>(null);

  useEffect(() => {
    logger.info('MyApplications page mounted', { file: 'src/pages/applicant/MyApplications.tsx', function: 'MyApplications' });
  }, []);

  const fetchApps = () => {
    setLoading(true);
    api.get('/applications', { params: { search: debouncedSearch, status: statusFilter, page, limit: 10 } })
      .then((r) => {
        const total = r.data.pagination.totalPages || 1;
        apiLogger.info(`Applications fetched: page ${page}/${total}`, { file: 'src/pages/applicant/MyApplications.tsx', function: 'fetchApps' });
        setApps(r.data.data); setTotalPages(total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const handleDelete = async () => {
    if (!confirm) return;
    logger.info(`Deleting application #${confirm.appNo}`, { file: 'src/pages/applicant/MyApplications.tsx', function: 'handleDelete' });
    try {
      await api.delete(`/applications/${confirm.id}`);
      toast.success('Application deleted');
      fetchApps();
    } catch (err: any) {
      errorLogger.error('Delete failed', { file: 'src/pages/applicant/MyApplications.tsx', function: 'handleDelete', message: err.message });
      toast.error(err.response?.data?.message || 'Delete failed');
    }
    setConfirm(null);
  };

  const handleWithdraw = async () => {
    if (!confirm) return;
    logger.info(`Withdrawing application #${confirm.appNo}`, { file: 'src/pages/applicant/MyApplications.tsx', function: 'handleWithdraw' });
    try {
      await api.post(`/applications/${confirm.id}/withdraw`);
      toast.success('Application withdrawn');
      fetchApps();
    } catch (err: any) {
      errorLogger.error('Withdraw failed', { file: 'src/pages/applicant/MyApplications.tsx', function: 'handleWithdraw', message: err.message });
      toast.error(err.response?.data?.message || 'Withdraw failed');
    }
    setConfirm(null);
  };

  useEffect(() => { fetchApps() }, [debouncedSearch, statusFilter, page]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Applications</h1>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]"><SearchBar value={search} onChange={setSearch} placeholder="Search by name or application #..." /></div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="ALL">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="ESCALATED">Escalated</option>
        </select>
      </div>

      {loading ? <TableSkeleton /> : apps.length === 0 ? <EmptyState title="No applications found" /> : (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-700">
                <th className="px-6 py-3 font-medium">App #</th>
                <th className="px-6 py-3 font-medium">Applicant</th>
                <th className="px-6 py-3 font-medium">Created</th>
                <th className="px-6 py-3 font-medium">Submitted</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Amount</th>
                <th className="px-6 py-3 font-medium">Action</th>
              </tr></thead>
              <tbody>
                {apps.map((app) => (
                  <tr key={app.id} className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">#{app.applicationNo}</td>
                    <td className="px-6 py-3 text-gray-700 dark:text-gray-300">{app.applicantName || '-'}</td>
                    <td className="px-6 py-3 text-gray-500">{new Date(app.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-3 text-gray-500">{app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : '-'}</td>
                    <td className="px-6 py-3"><StatusBadge status={app.status} /></td>
                    <td className="px-6 py-3 text-gray-700 dark:text-gray-300">₹{app.loanAmount?.toLocaleString() || '-'}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => navigate(`/applicant/new/${app.id}`)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20" title="View / Edit">
                          {app.status === 'DRAFT' ? <Pencil className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        {app.status === 'DRAFT' && (
                          <button onClick={() => setConfirm({ action: 'delete', id: app.id, appNo: app.applicationNo })}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {app.status === 'SUBMITTED' && (
                          <button onClick={() => setConfirm({ action: 'withdraw', id: app.id, appNo: app.applicationNo })}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20" title="Withdraw">
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.action === 'delete' ? 'Delete Application' : 'Withdraw Application'}
        message={confirm?.action === 'delete'
          ? `Delete application #${confirm?.appNo}? This cannot be undone.`
          : `Withdraw application #${confirm?.appNo}? It will be moved back to DRAFT.`}
        confirmLabel={confirm?.action === 'delete' ? 'Delete' : 'Withdraw'}
        onConfirm={confirm?.action === 'delete' ? handleDelete : handleWithdraw}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
