import { useEffect, useState } from 'react';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';
import { TableSkeleton } from '../../components/LoadingSkeleton';
import EmptyState from '../../components/EmptyState';
import type { Application } from '../../types';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

export default function EscalatedCases() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Application | null>(null);
  const [reason, setReason] = useState('');
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/applications', { params: { status: 'ESCALATED', limit: 100 } })
      .then((r) => setApps(r.data.data)).finally(() => setLoading(false));
  }, []);

  const handleAction = async () => {
    if (!selected || !action) return;
    if (action === 'reject' && !reason.trim()) { toast.error('Rejection reason is mandatory'); return; }
    setSubmitting(true);
    try {
      if (action === 'approve') await api.post(`/applications/${selected.id}/approve`);
      else await api.post(`/applications/${selected.id}/reject`, { reason });
      toast.success(`Application ${action}d`);
      setApps((p) => p.filter((a) => a.id !== selected.id));
      setSelected(null); setAction(null); setReason('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="space-y-6"><h1 className="text-2xl font-bold">Escalated Cases</h1><TableSkeleton /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Escalated Cases</h1>

      {apps.length === 0 ? <EmptyState title="No escalated cases" /> : (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-700">
                <th className="px-6 py-3 font-medium">App #</th>
                <th className="px-6 py-3 font-medium">Applicant</th>
                <th className="px-6 py-3 font-medium">Loan Amount</th>
                <th className="px-6 py-3 font-medium">Risk Score</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Action</th>
              </tr></thead>
              <tbody>
                {apps.map((app) => (
                  <tr key={app.id} className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">#{app.applicationNo}</td>
                    <td className="px-6 py-3 text-gray-700 dark:text-gray-300">{app.applicantName || '-'}</td>
                    <td className="px-6 py-3 text-gray-700 dark:text-gray-300">₹{app.loanAmount?.toLocaleString() || '-'}</td>
                    <td className="px-6 py-3">{app.riskAssessment?.riskScore ?? '-'}</td>
                    <td className="px-6 py-3"><StatusBadge status={app.status} /></td>
                    <td className="px-6 py-3"><button onClick={() => setSelected(app)} className="px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 dark:bg-primary-900/30 rounded-lg">Review</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex bg-black/40" onClick={() => !submitting && setSelected(null)}>
          <div className="flex w-full h-full" onClick={(e) => e.stopPropagation()}>
            <div className="w-1/2 bg-gray-100 dark:bg-slate-900 p-6 flex items-center justify-center">
              <div className="text-center text-gray-400"><p className="text-lg">PDF Preview</p><p className="text-sm mt-1">{selected.pdfName}</p></div>
            </div>
            <div className="w-1/2 bg-white dark:bg-slate-800 overflow-auto p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Application #{selected.applicationNo}</h2>

              {selected.riskAssessment && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Risk Score</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{selected.riskAssessment.riskScore}/100</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Fraud Probability</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{(selected.riskAssessment.fraudProbability * 100).toFixed(0)}%</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">AI Summary</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{selected.riskAssessment.aiSummary || 'No summary'}</p>
                  </div>

                  <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Recommendation</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{selected.riskAssessment.policyRecommendation || 'N/A'}</p>
                  </div>

                  {selected.escalationReason && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                      <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">Escalation Reason (from Policy Manager)</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{selected.escalationReason}</p>
                    </div>
                  )}
                </div>
              )}

              {action === null ? (
                <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
                  <button onClick={() => setAction('approve')} className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700">Approve</button>
                  <button onClick={() => setAction('reject')} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700">Reject</button>
                </div>
              ) : (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rejection Reason *</label>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  <div className="flex gap-2 mt-3">
                    <button onClick={handleAction} disabled={submitting} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-2">
                      {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Confirm
                    </button>
                    <button onClick={() => setAction(null)} className="px-4 py-2 text-gray-600 bg-gray-100 dark:bg-slate-700 rounded-lg">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
