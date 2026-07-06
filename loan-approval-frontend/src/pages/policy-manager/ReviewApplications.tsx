import { useEffect, useState } from 'react';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';
import { TableSkeleton } from '../../components/LoadingSkeleton';
import EmptyState from '../../components/EmptyState';
import type { Application } from '../../types';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, ArrowUpRight, Loader2, X } from 'lucide-react';
import { logger, apiLogger, errorLogger } from '../../utils/logger';

export default function ReviewApplications() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Application | null>(null);
  const [action, setAction] = useState<'approve' | 'reject' | 'escalate' | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    logger.info('ReviewApplications page mounted', { file: 'src/pages/policy-manager/ReviewApplications.tsx', function: 'ReviewApplications' });
    api.get('/applications', { params: { status: 'SUBMITTED', limit: 100 }, signal: controller.signal })
      .then((r) => {
        apiLogger.info(`Review apps loaded: ${r.data.data.length} pending`, { file: 'src/pages/policy-manager/ReviewApplications.tsx' });
        setApps(r.data.data);
      }).catch((err) => {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
          errorLogger.error('Failed to load review apps', { file: 'src/pages/policy-manager/ReviewApplications.tsx', message: err.message });
          toast.error('Failed to load applications');
        }
      }).finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const handleAction = async (directAction?: 'approve' | 'reject' | 'escalate') => {
    const currentAction = directAction || action;
    if (!selected || !currentAction) return;
    if ((currentAction === 'reject' || currentAction === 'escalate') && !reason.trim()) {
      toast.error('Reason is mandatory');
      return;
    }
    setSubmitting(true);
    apiLogger.info(`Review action: ${currentAction} on application #${selected.applicationNo}`, {
      file: 'src/pages/policy-manager/ReviewApplications.tsx', function: 'handleAction',
    });
    try {
      if (currentAction === 'approve') await api.post(`/applications/${selected.id}/approve`);
      else if (currentAction === 'reject') await api.post(`/applications/${selected.id}/reject`, { reason });
      else await api.post(`/applications/${selected.id}/escalate`, { reason });
      toast.success(`Application ${currentAction}d successfully`);
      setApps((p) => p.filter((a) => a.id !== selected.id));
      setSelected(null); setAction(null); setReason('');
    } catch (err: any) {
      errorLogger.error(`Review action failed: ${currentAction}`, {
        file: 'src/pages/policy-manager/ReviewApplications.tsx', function: 'handleAction',
        message: err.response?.data?.message || err.message,
      });
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="space-y-6"><h1 className="text-2xl font-bold">Review Applications</h1><TableSkeleton /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Review Applications</h1>

      {apps.length === 0 ? <EmptyState title="No pending applications" description="All applications have been reviewed" /> : (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-700">
                <th className="px-6 py-3 font-medium">App #</th>
                <th className="px-6 py-3 font-medium">Applicant</th>
                <th className="px-6 py-3 font-medium">Submitted</th>
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
                    <td className="px-6 py-3 text-gray-500">{app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : '-'}</td>
                    <td className="px-6 py-3 text-gray-700 dark:text-gray-300">₹{app.loanAmount?.toLocaleString() || '-'}</td>
                    <td className="px-6 py-3">{app.riskAssessment?.riskScore != null ? <span className={`font-medium ${app.riskAssessment.riskScore >= 70 ? 'text-green-600' : app.riskAssessment.riskScore >= 45 ? 'text-yellow-600' : 'text-red-600'}`}>{app.riskAssessment.riskScore}</span> : '-'}</td>
                    <td className="px-6 py-3"><StatusBadge status={app.status} /></td>
                    <td className="px-6 py-3">
                      <button onClick={() => setSelected(app)} className="px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 dark:bg-primary-900/30 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50">Review</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex bg-black/40" onClick={() => !submitting && (setSelected(null), setAction(null), setReason(''))}>
          <div className="flex w-full h-full" onClick={(e) => e.stopPropagation()}>
            <div className="relative w-1/2 bg-gray-100 dark:bg-slate-900 p-6 flex items-center justify-center">
              <button onClick={() => { setSelected(null); setAction(null); setReason(''); }} className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/80 dark:bg-slate-800/80 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
              <div className="text-center text-gray-400"><p className="text-lg">PDF Preview</p><p className="text-sm mt-1">{selected.pdfName}</p></div>
            </div>
            <div className="w-1/2 bg-white dark:bg-slate-800 overflow-auto p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">AI Analysis — #{selected.applicationNo}</h2>

              {selected.riskAssessment && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Risk Score</p>
                      <p className={`text-lg font-bold ${selected.riskAssessment.riskScore >= 70 ? 'text-green-600' : selected.riskAssessment.riskScore >= 45 ? 'text-yellow-600' : 'text-red-600'}`}>{selected.riskAssessment.riskScore}/100</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Fraud Probability</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{(selected.riskAssessment.fraudProbability * 100).toFixed(0)}%</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Confidence Score</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{(selected.riskAssessment.confidenceScore * 100).toFixed(0)}%</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Approval Probability</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{(selected.riskAssessment.approvalProbability * 100).toFixed(0)}%</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">AI Summary</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{selected.riskAssessment.aiSummary || 'No summary available'}</p>
                  </div>

                  {selected.extractedFields.filter((f) => f.fieldName !== 'confidence').length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Extracted Data</p>
                      <div className="grid grid-cols-2 gap-2">
                        {selected.extractedFields.filter((f) => f.fieldName !== 'confidence').map((f) => (
                          <div key={f.id} className={`rounded-lg px-3 py-2 ${f.needsVerification ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-600' : 'bg-gray-50 dark:bg-slate-700/50'}`}>
                            <p className="text-xs text-gray-500">{f.fieldName.replace(/([A-Z])/g, ' $1').trim()}</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{f.fieldValue || '-'} {f.needsVerification && <span className="text-yellow-600 text-xs ml-1">Needs Verification</span>}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-gray-500">Document Quality:</span> <span className="text-gray-900 dark:text-white font-medium">{selected.riskAssessment.documentQuality}</span></div>
                      <div><span className="text-gray-500">Missing Docs:</span> <span className="text-gray-900 dark:text-white font-medium">{selected.riskAssessment.missingDocuments || 'None'}</span></div>
                      <div><span className="text-gray-500">Income Verified:</span> <span className={selected.riskAssessment.incomeVerified ? 'text-green-600' : 'text-red-600'}>{selected.riskAssessment.incomeVerified ? 'Yes' : 'No'}</span></div>
                      <div><span className="text-gray-500">Employment Verified:</span> <span className={selected.riskAssessment.employmentVerified ? 'text-green-600' : 'text-red-600'}>{selected.riskAssessment.employmentVerified ? 'Yes' : 'No'}</span></div>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Recommendation</p>
                    <p className={`text-sm font-semibold ${selected.riskAssessment.policyRecommendation === 'Approve' ? 'text-green-600' : selected.riskAssessment.policyRecommendation === 'Reject' ? 'text-red-600' : 'text-yellow-600'}`}>
                      {selected.riskAssessment.policyRecommendation || 'Review Required'}
                    </p>
                  </div>
                </div>
              )}

              {action === null ? (
                <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
                  <button onClick={() => handleAction('approve')} className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 inline-flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" /> Approve</button>
                  <button onClick={() => setAction('reject')} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 inline-flex items-center justify-center gap-2"><XCircle className="w-4 h-4" /> Reject</button>
                  <button onClick={() => setAction('escalate')} className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 inline-flex items-center justify-center gap-2"><ArrowUpRight className="w-4 h-4" /> Escalate</button>
                </div>
              ) : (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {action === 'reject' ? 'Rejection Reason *' : 'Escalation Reason *'}
                  </label>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleAction()} disabled={submitting}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-2">
                      {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Confirm
                    </button>
                    <button onClick={() => setAction(null)} className="px-4 py-2 text-gray-600 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600">Cancel</button>
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
