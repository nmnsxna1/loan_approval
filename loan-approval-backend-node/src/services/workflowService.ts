import prisma from '../utils/prisma';
import { STATUS } from '../config/auth';
import { dbLogger } from '../utils/logger';

export async function createAuditLog(params: {
  userId?: string;
  applicationId?: string;
  action: string;
  details?: string;
  performedBy?: string;
  performedByRole?: string;
  ipAddress?: string;
}) {
  return prisma.auditLog.create({ data: params });
}

export async function addHistory(params: {
  applicationId: string;
  status: string;
  action: string;
  performedBy: string;
  performedByRole: string;
  reason?: string;
}) {
  return prisma.applicationHistory.create({ data: params });
}

export async function submitApplication(applicationId: string) {
  const app = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!app) throw new Error('Application not found');
  if (app.status !== STATUS.DRAFT) throw new Error('Only draft applications can be submitted');

  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: { status: STATUS.SUBMITTED, submittedAt: new Date() },
  });

  dbLogger.info(`Application ${applicationId} submitted`, {
    file: 'src/services/workflowService.ts',
    function: 'submitApplication',
  });
  return updated;
}

export async function approveApplication(applicationId: string, userId: string, role: string, username: string) {
  const app = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!app) throw new Error('Application not found');

  if (role === 'POLICY_MANAGER') {
    if (app.status !== STATUS.SUBMITTED && app.status !== STATUS.UNDER_REVIEW) {
      throw new Error('Application is not in reviewable status');
    }
    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: { status: STATUS.APPROVED, policyManagerId: userId, policyDecidedAt: new Date() },
    });
    await addHistory({ applicationId, status: STATUS.APPROVED, action: 'APPROVED_BY_POLICY', performedBy: username, performedByRole: role });
    dbLogger.info(`Application ${applicationId} approved by Policy Manager`, {
      file: 'src/services/workflowService.ts', function: 'approveApplication',
    });
    return updated;
  }

  if (role === 'MAIN_MANAGER') {
    if (app.status !== STATUS.ESCALATED) throw new Error('Application is not escalated');
    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: { status: STATUS.APPROVED, mainManagerId: userId, mainDecidedAt: new Date() },
    });
    await addHistory({ applicationId, status: STATUS.APPROVED, action: 'APPROVED_BY_MAIN', performedBy: username, performedByRole: role });
    dbLogger.info(`Application ${applicationId} approved by Main Manager`, {
      file: 'src/services/workflowService.ts', function: 'approveApplication',
    });
    return updated;
  }

  throw new Error('Unauthorized action');
}

export async function rejectApplication(applicationId: string, userId: string, role: string, username: string, reason: string) {
  if (!reason || reason.trim() === '') throw new Error('Rejection reason is mandatory');

  const app = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!app) throw new Error('Application not found');

  if (role === 'POLICY_MANAGER') {
    if (app.status !== STATUS.SUBMITTED && app.status !== STATUS.UNDER_REVIEW) throw new Error('Invalid status');
    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: { status: STATUS.REJECTED, rejectReason: reason, policyManagerId: userId, policyDecidedAt: new Date() },
    });
    await addHistory({ applicationId, status: STATUS.REJECTED, action: 'REJECTED_BY_POLICY', performedBy: username, performedByRole: role, reason });
    dbLogger.info(`Application ${applicationId} rejected by Policy Manager`, {
      file: 'src/services/workflowService.ts', function: 'rejectApplication',
    });
    return updated;
  }

  if (role === 'MAIN_MANAGER') {
    if (app.status !== STATUS.ESCALATED) throw new Error('Application is not escalated');
    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: { status: STATUS.REJECTED, rejectReason: reason, mainManagerId: userId, mainDecidedAt: new Date() },
    });
    await addHistory({ applicationId, status: STATUS.REJECTED, action: 'REJECTED_BY_MAIN', performedBy: username, performedByRole: role, reason });
    dbLogger.info(`Application ${applicationId} rejected by Main Manager`, {
      file: 'src/services/workflowService.ts', function: 'rejectApplication',
    });
    return updated;
  }

  throw new Error('Unauthorized action');
}

export async function escalateApplication(applicationId: string, userId: string, username: string, reason: string) {
  if (!reason || reason.trim() === '') throw new Error('Escalation reason is mandatory');

  const app = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!app) throw new Error('Application not found');
  if (app.status !== STATUS.SUBMITTED && app.status !== STATUS.UNDER_REVIEW) throw new Error('Invalid status');

  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: { status: STATUS.ESCALATED, escalationReason: reason, policyManagerId: userId, policyDecidedAt: new Date() },
  });
  await addHistory({ applicationId, status: STATUS.ESCALATED, action: 'ESCALATED', performedBy: username, performedByRole: 'POLICY_MANAGER', reason });
  dbLogger.info(`Application ${applicationId} escalated to Main Manager`, {
    file: 'src/services/workflowService.ts', function: 'escalateApplication',
  });
  return updated;
}
