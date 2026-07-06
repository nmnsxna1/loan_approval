import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getDashboard,
  getApplications,
  getApplicationById,
  createApplication,
  updateApplication,
  handleSubmit,
  handleApprove,
  handleReject,
  handleEscalate,
  handleDelete,
  handleWithdraw,
  getHistory,
  getAuditLogs,
} from '../controllers/applicationController';

const router = Router();

router.use(authenticate);

router.get('/dashboard', getDashboard);
router.get('/', getApplications);
router.get('/audit-logs', authorize('MAIN_MANAGER'), getAuditLogs);
router.get('/:id', getApplicationById);
router.post('/', authorize('APPLICANT'), createApplication);
router.put('/:id', authorize('APPLICANT'), updateApplication);
router.post('/:id/submit', authorize('APPLICANT'), handleSubmit);
router.post('/:id/approve', authorize('POLICY_MANAGER', 'MAIN_MANAGER'), handleApprove);
router.post('/:id/reject', authorize('POLICY_MANAGER', 'MAIN_MANAGER'), handleReject);
router.post('/:id/escalate', authorize('POLICY_MANAGER'), handleEscalate);
router.get('/:id/history', getHistory);
router.delete('/:id', authorize('APPLICANT'), handleDelete);
router.post('/:id/withdraw', authorize('APPLICANT'), handleWithdraw);

export default router;
