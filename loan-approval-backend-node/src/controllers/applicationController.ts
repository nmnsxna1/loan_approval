import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { STATUS } from '../config/auth';
import { backendLogger, apiLogger } from '../utils/logger';
import { validateApplication } from '../services/validationEngine';
import { submitApplication, approveApplication, rejectApplication, escalateApplication, addHistory, createAuditLog } from '../services/workflowService';

export async function getDashboard(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const role = req.user!.role;

  apiLogger.info(`Dashboard requested for ${role} ${userId}`, {
    file: 'src/controllers/applicationController.ts',
    function: 'getDashboard',
    userId,
    requestId: req.requestId,
  });

  if (role === 'APPLICANT') {
    const apps = await prisma.application.findMany({ where: { userId } });
    const drafts = apps.filter(a => a.status === STATUS.DRAFT).length;
    const submitted = apps.filter(a => a.status !== STATUS.DRAFT).length;
    const lastSubmitted = apps.filter(a => a.submittedAt).sort((a, b) => (b.submittedAt?.getTime() || 0) - (a.submittedAt?.getTime() || 0))[0];
    res.json({
      pendingDrafts: drafts,
      submittedApplications: submitted,
      totalApplications: apps.length,
      lastSubmittedDate: lastSubmitted?.submittedAt || null,
      recentActivity: apps.slice(-5).reverse(),
    });
  } else if (role === 'POLICY_MANAGER') {
    const allApps = await prisma.application.findMany({ where: { status: { not: STATUS.DRAFT } } });
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const reviewedToday = allApps.filter(a => a.updatedAt >= today && (a.status === STATUS.APPROVED || a.status === STATUS.REJECTED || a.status === STATUS.ESCALATED));
    res.json({
      pendingApplications: allApps.filter(a => a.status === STATUS.SUBMITTED || a.status === STATUS.UNDER_REVIEW).length,
      reviewedToday: reviewedToday.length,
      escalatedCases: allApps.filter(a => a.status === STATUS.ESCALATED).length,
      approvedCases: allApps.filter(a => a.status === STATUS.APPROVED).length,
      rejectedCases: allApps.filter(a => a.status === STATUS.REJECTED).length,
    });
  } else if (role === 'MAIN_MANAGER') {
    const allApps = await prisma.application.findMany();
    res.json({
      pendingEscalated: allApps.filter(a => a.status === STATUS.ESCALATED).length,
      approvedCases: allApps.filter(a => a.status === STATUS.APPROVED).length,
      rejectedCases: allApps.filter(a => a.status === STATUS.REJECTED).length,
      totalApprovedLoans: allApps.filter(a => a.status === STATUS.APPROVED).length,
    });
  } else {
    res.status(400).json({ message: 'Unknown role' });
  }
}

export async function getApplications(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const role = req.user!.role;
  const { search, status, page = '1', limit = '10' } = req.query;

  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 10));
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};
  if (role === 'APPLICANT') where.userId = userId;
  if (status && status !== 'ALL') where.status = status;
  if (search) {
    where.OR = [
      { applicantName: { contains: search as string, mode: 'insensitive' } },
      { applicationNo: parseInt(search as string) ? { equals: parseInt(search as string) } : undefined },
    ].filter(Boolean);
  }

  const [data, total] = await Promise.all([
    prisma.application.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
      include: { riskAssessment: true, user: { select: { username: true } } },
    }),
    prisma.application.count({ where }),
  ]);

  apiLogger.info(`Applications listed: ${total} total for ${role}`, {
    file: 'src/controllers/applicationController.ts',
    function: 'getApplications',
    userId,
    requestId: req.requestId,
  });

  res.json({
    data,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  });
}

export async function getApplicationById(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const app = await prisma.application.findUnique({
    where: { id },
    include: {
      documents: true,
      extractedFields: true,
      riskAssessment: true,
      applicationHistory: { orderBy: { createdAt: 'asc' } },
      user: { select: { username: true, email: true } },
    },
  });
  if (!app) {
    apiLogger.warn(`Application not found: ${id}`, {
      file: 'src/controllers/applicationController.ts',
      function: 'getApplicationById',
      userId: req.user!.id,
      requestId: req.requestId,
    });
    return res.status(404).json({ message: 'Application not found' });
  }
  apiLogger.info(`Application ${id} retrieved`, {
    file: 'src/controllers/applicationController.ts',
    function: 'getApplicationById',
    userId: req.user!.id,
    requestId: req.requestId,
  });
  res.json(app);
}

export async function createApplication(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const data = req.body;

  const app = await prisma.application.create({
    data: {
      userId,
      status: STATUS.DRAFT,
      ...data,
    },
  });

  await addHistory({ applicationId: app.id, status: STATUS.DRAFT, action: 'CREATED', performedBy: req.user!.username, performedByRole: 'APPLICANT' });

  apiLogger.info(`Application created: ${app.id}`, {
    file: 'src/controllers/applicationController.ts',
    function: 'createApplication',
    userId,
    requestId: req.requestId,
  });

  res.status(201).json(app);
}

export async function updateApplication(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const data = req.body;
  const app = await prisma.application.findUnique({ where: { id } });
  if (!app) {
    apiLogger.warn(`Application not found for update: ${id}`, {
      file: 'src/controllers/applicationController.ts',
      function: 'updateApplication', userId: req.user!.id, requestId: req.requestId,
    });
    return res.status(404).json({ message: 'Application not found' });
  }
  if (app.status !== STATUS.DRAFT) {
    apiLogger.warn(`Cannot update non-draft application: ${id}`, {
      file: 'src/controllers/applicationController.ts',
      function: 'updateApplication', userId: req.user!.id, requestId: req.requestId,
    });
    return res.status(400).json({ message: 'Only draft applications can be edited' });
  }

  if (data.monthlyIncome !== undefined) data.monthlyIncome = parseFloat(data.monthlyIncome) || 0;
  if (data.loanAmount !== undefined) data.loanAmount = parseFloat(data.loanAmount) || 0;

  const updated = await prisma.application.update({ where: { id }, data });
  apiLogger.info(`Application ${id} updated`, {
    file: 'src/controllers/applicationController.ts',
    function: 'updateApplication', userId: req.user!.id, requestId: req.requestId,
  });
  res.json(updated);
}

export async function handleSubmit(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const data = req.body;

  if (data.monthlyIncome !== undefined) data.monthlyIncome = parseFloat(data.monthlyIncome) || 0;
  if (data.loanAmount !== undefined) data.loanAmount = parseFloat(data.loanAmount) || 0;

  const updated = await prisma.application.update({ where: { id }, data });
  const validation = validateApplication(data);

  const finalApp = await submitApplication(id);

  await addHistory({ applicationId: id, status: STATUS.SUBMITTED, action: 'SUBMITTED', performedBy: req.user!.username, performedByRole: 'APPLICANT' });
  await createAuditLog({ applicationId: id, action: 'APPLICATION_SUBMITTED', performedBy: req.user!.username, performedByRole: 'APPLICANT' });

  apiLogger.info(`Application ${id} submitted`, {
    file: 'src/controllers/applicationController.ts',
    function: 'handleSubmit', userId: req.user!.id, requestId: req.requestId,
  });

  res.json({ application: finalApp, validation });
}

export async function handleApprove(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const updated = await approveApplication(id, req.user!.id, req.user!.role, req.user!.username);
  await createAuditLog({ applicationId: id, action: 'APPROVED', performedBy: req.user!.username, performedByRole: req.user!.role });
  apiLogger.info(`Application ${id} approved by ${req.user!.username}`, {
    file: 'src/controllers/applicationController.ts',
    function: 'handleApprove', userId: req.user!.id, requestId: req.requestId,
  });
  res.json(updated);
}

export async function handleReject(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { reason } = req.body;
  const updated = await rejectApplication(id, req.user!.id, req.user!.role, req.user!.username, reason);
  await createAuditLog({ applicationId: id, action: 'REJECTED', performedBy: req.user!.username, performedByRole: req.user!.role });
  apiLogger.info(`Application ${id} rejected by ${req.user!.username}`, {
    file: 'src/controllers/applicationController.ts',
    function: 'handleReject', userId: req.user!.id, requestId: req.requestId,
  });
  res.json(updated);
}

export async function handleEscalate(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { reason } = req.body;
  const updated = await escalateApplication(id, req.user!.id, req.user!.username, reason);
  await createAuditLog({ applicationId: id, action: 'ESCALATED', performedBy: req.user!.username, performedByRole: req.user!.role });
  apiLogger.info(`Application ${id} escalated by ${req.user!.username}`, {
    file: 'src/controllers/applicationController.ts',
    function: 'handleEscalate', userId: req.user!.id, requestId: req.requestId,
  });
  res.json(updated);
}

export async function getHistory(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const history = await prisma.applicationHistory.findMany({
    where: { applicationId: id },
    orderBy: { createdAt: 'asc' },
  });
  res.json(history);
}

export async function getAuditLogs(req: AuthRequest, res: Response) {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { user: { select: { username: true } }, application: { select: { applicationNo: true } } },
  });
  apiLogger.info(`Audit logs retrieved (${logs.length} entries)`, {
    file: 'src/controllers/applicationController.ts',
    function: 'getAuditLogs', userId: req.user!.id, requestId: req.requestId,
  });
  res.json(logs);
}

export async function handleDelete(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const app = await prisma.application.findUnique({ where: { id } });
  if (!app) return res.status(404).json({ message: 'Application not found' });
  if (app.userId !== req.user!.id) return res.status(403).json({ message: 'Unauthorized' });
  if (app.status !== STATUS.DRAFT) return res.status(400).json({ message: 'Only draft applications can be deleted' });

  await createAuditLog({ applicationId: id, action: 'APPLICATION_DELETED', performedBy: req.user!.username, performedByRole: 'APPLICANT' });
  await prisma.applicationHistory.deleteMany({ where: { applicationId: id } });
  await prisma.auditLog.deleteMany({ where: { applicationId: id } });
  await prisma.extractedField.deleteMany({ where: { applicationId: id } });
  await prisma.riskAssessment.deleteMany({ where: { applicationId: id } });
  await prisma.document.deleteMany({ where: { applicationId: id } });
  await prisma.application.delete({ where: { id } });

  apiLogger.info(`Application ${id} deleted`, {
    file: 'src/controllers/applicationController.ts',
    function: 'handleDelete', userId: req.user!.id, requestId: req.requestId,
  });
  res.json({ message: 'Application deleted' });
}

export async function handleWithdraw(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const app = await prisma.application.findUnique({ where: { id } });
  if (!app) return res.status(404).json({ message: 'Application not found' });
  if (app.userId !== req.user!.id) return res.status(403).json({ message: 'Unauthorized' });
  if (app.status !== STATUS.SUBMITTED) return res.status(400).json({ message: 'Only submitted applications can be withdrawn' });

  const updated = await prisma.application.update({
    where: { id }, data: { status: STATUS.DRAFT, submittedAt: null },
  });

  await addHistory({ applicationId: id, status: STATUS.DRAFT, action: 'WITHDRAWN', performedBy: req.user!.username, performedByRole: 'APPLICANT' });
  await createAuditLog({ applicationId: id, action: 'APPLICATION_WITHDRAWN', performedBy: req.user!.username, performedByRole: 'APPLICANT' });

  apiLogger.info(`Application ${id} withdrawn`, {
    file: 'src/controllers/applicationController.ts',
    function: 'handleWithdraw', userId: req.user!.id, requestId: req.requestId,
  });
  res.json(updated);
}
