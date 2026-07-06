import request from 'supertest';
import app from '../app';

var mockPrisma: any;
jest.mock('@prisma/client', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    application: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    auditLog: { create: jest.fn(), findMany: jest.fn(), deleteMany: jest.fn() },
    applicationHistory: { create: jest.fn(), findMany: jest.fn(), deleteMany: jest.fn() },
    extractedField: { findMany: jest.fn(), createMany: jest.fn(), deleteMany: jest.fn() },
    riskAssessment: { create: jest.fn(), deleteMany: jest.fn() },
    document: { create: jest.fn(), deleteMany: jest.fn() },
    $disconnect: jest.fn(),
  };
  mockPrisma = prisma;
  return { PrismaClient: jest.fn().mockImplementation(() => prisma) };
});

jest.mock('bcryptjs', () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXItMSIsInVzZXJuYW1lIjoiYXBwbGljYW50MSIsInJvbGUiOiJBUFBMSUNBTlQifQ.fake';
const pmToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXItMiIsInVzZXJuYW1lIjoicG9saWN5bWdyaSIsInJvbGUiOiJQT0xJQ1lfTUFOQUdFUiJ9.fake';
const mmToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXItMyIsInVzZXJuYW1lIjoibWFpbm1nciIsInJvbGUiOiJNQUlOX01BTkFHRVIifQ.fake';

const mockDraftApp = {
  id: 'app-1',
  applicationNo: 1001,
  userId: 'user-1',
  applicantName: 'John Doe',
  status: 'DRAFT',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-02'),
  submittedAt: null,
};

const mockSubmittedApp = {
  id: 'app-1',
  applicationNo: 1001,
  userId: 'user-1',
  applicantName: 'John Doe',
  status: 'SUBMITTED',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-02'),
  submittedAt: new Date('2026-01-02'),
};

jest.mock('../utils/jwt', () => {
  return {
    verifyToken: jest.fn((token: string) => {
      const tokens: Record<string, { id: string; username: string; role: string }> = {
        [validToken]: { id: 'user-1', username: 'applicant1', role: 'APPLICANT' },
        [pmToken]: { id: 'user-2', username: 'policymgr', role: 'POLICY_MANAGER' },
        [mmToken]: { id: 'user-3', username: 'mainmgr', role: 'MAIN_MANAGER' },
        unknown: { id: 'user-x', username: 'unknown', role: 'UNKNOWN' },
      };
      const decoded = tokens[token];
      if (!decoded) throw new Error('Invalid token');
      return decoded;
    }),
    generateToken: jest.fn().mockReturnValue('generated-token'),
  };
});

jest.mock('../utils/logger', () => ({
  backendLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn() },
  apiLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn() },
  dbLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn() },
  authLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn() },
  errorLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn() },
  perfLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn() },
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), fatal: jest.fn() },
}));

describe('API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Health Check', () => {
    it('GET /api/health returns ok', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });

  const mockUnderReviewApp = {
    ...mockSubmittedApp,
    status: 'UNDER_REVIEW',
  };

  const mockEscalatedApp = {
    id: 'app-esc-1',
    applicationNo: 2001,
    userId: 'user-1',
    applicantName: 'Escalated Person',
    status: 'ESCALATED',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-05'),
    submittedAt: new Date('2026-01-02'),
  };

  const mockOtherUserApp = {
    id: 'app-other',
    applicationNo: 1002,
    userId: 'user-99',
    applicantName: 'Other User',
    status: 'DRAFT',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    submittedAt: null,
  };

  const mockApprovedApp = {
    id: 'app-approved',
    applicationNo: 3001,
    userId: 'user-1',
    applicantName: 'Approved Person',
    status: 'APPROVED',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-05'),
    submittedAt: new Date('2026-01-02'),
  };

  describe('Authentication', () => {
    it('POST /api/auth/login returns token on valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'applicant1',
        password: 'hashed',
        email: 'a@b.com',
        role: 'APPLICANT',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'applicant1', password: 'pass123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.role).toBe('APPLICANT');
    });

    it('POST /api/auth/login returns 401 on invalid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nonexistent', password: 'pass123' });

      expect(res.status).toBe(401);
    });

    it('POST /api/auth/login returns 400 for empty body', async () => {
      const res = await request(app).post('/api/auth/login').send({});
      expect(res.status).toBe(400);
    });

    it('POST /api/auth/login returns 400 for missing password', async () => {
      const res = await request(app).post('/api/auth/login').send({ username: 'test' });
      expect(res.status).toBe(400);
    });

    it('POST /api/auth/login returns 400 for missing username', async () => {
      const res = await request(app).post('/api/auth/login').send({ password: 'pass' });
      expect(res.status).toBe(400);
    });

    it('GET /api/applications returns 401 without token', async () => {
      const res = await request(app).get('/api/applications');
      expect(res.status).toBe(401);
    });

    it('GET /api/applications returns 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/applications')
        .set('Authorization', 'Bearer invalid-token');
      expect(res.status).toBe(401);
    });

    it('GET /api/applications returns 401 with malformed Bearer header', async () => {
      const res = await request(app)
        .get('/api/applications')
        .set('Authorization', 'Bearer');
      expect(res.status).toBe(401);
    });

    it('GET /api/applications returns 401 with non-Bearer auth header', async () => {
      const res = await request(app)
        .get('/api/applications')
        .set('Authorization', 'Basic dGVzdDpwYXNz');
      expect(res.status).toBe(401);
    });
  });

  describe('Applications CRUD', () => {
    it('GET /api/applications returns paginated applications for applicant', async () => {
      mockPrisma.application.findMany.mockResolvedValue([mockSubmittedApp]);
      mockPrisma.application.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/applications')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination.totalPages).toBe(1);
    });

    it('GET /api/applications filters by status', async () => {
      mockPrisma.application.findMany.mockResolvedValue([]);
      mockPrisma.application.count.mockResolvedValue(0);

      const res = await request(app)
        .get('/api/applications?status=APPROVED')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
    });

    it('GET /api/applications/:id returns application by id', async () => {
      mockPrisma.application.findUnique.mockResolvedValue(mockSubmittedApp);

      const res = await request(app)
        .get('/api/applications/app-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('app-1');
    });

    it('POST /api/applications creates application (applicant only)', async () => {
      const newApp = { applicantName: 'Jane Doe', loanAmount: 50000 };
      mockPrisma.application.create.mockResolvedValue({ id: 'app-2', ...newApp, status: 'DRAFT' });

      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${validToken}`)
        .send(newApp);

      expect(res.status).toBe(201);
    });

    it('POST /api/applications returns 403 for non-applicant', async () => {
      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({ applicantName: 'Test' });

      expect(res.status).toBe(403);
    });

    it('PUT /api/applications/:id updates application (must be DRAFT)', async () => {
      mockPrisma.application.findUnique.mockResolvedValue(mockDraftApp);
      mockPrisma.application.update.mockResolvedValue({ ...mockDraftApp, applicantName: 'Updated' });

      const res = await request(app)
        .put('/api/applications/app-1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ applicantName: 'Updated' });

      expect(res.status).toBe(200);
    });

    it('DELETE /api/applications/:id deletes application (must be DRAFT)', async () => {
      mockPrisma.application.findUnique.mockResolvedValue(mockDraftApp);
      mockPrisma.application.delete.mockResolvedValue(mockDraftApp);

      const res = await request(app)
        .delete('/api/applications/app-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
    });

    it('GET /api/applications/:id returns 404 for non-existent application', async () => {
      mockPrisma.application.findUnique.mockResolvedValue(null);
      const res = await request(app)
        .get('/api/applications/nonexistent')
        .set('Authorization', `Bearer ${validToken}`);
      expect(res.status).toBe(404);
    });

    it('PUT /api/applications/:id returns 404 for non-existent application', async () => {
      mockPrisma.application.findUnique.mockResolvedValue(null);
      const res = await request(app)
        .put('/api/applications/nonexistent')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ applicantName: 'Updated' });
      expect(res.status).toBe(404);
    });

    it('PUT /api/applications/:id returns 400 for non-DRAFT application', async () => {
      mockPrisma.application.findUnique.mockResolvedValue(mockSubmittedApp);
      const res = await request(app)
        .put('/api/applications/app-1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ applicantName: 'Updated' });
      expect(res.status).toBe(400);
    });

    it('DELETE /api/applications/:id returns 400 for non-DRAFT application', async () => {
      mockPrisma.application.findUnique.mockResolvedValue(mockSubmittedApp);
      const res = await request(app)
        .delete('/api/applications/app-1')
        .set('Authorization', `Bearer ${validToken}`);
      expect(res.status).toBe(400);
    });

    it('DELETE /api/applications/:id returns 403 for another user\'s application', async () => {
      mockPrisma.application.findUnique.mockResolvedValue(mockOtherUserApp);
      const res = await request(app)
        .delete('/api/applications/app-other')
        .set('Authorization', `Bearer ${validToken}`);
      expect(res.status).toBe(403);
    });

    it('GET /api/applications handles pagination edge cases', async () => {
      mockPrisma.application.findMany.mockResolvedValue([]);
      mockPrisma.application.count.mockResolvedValue(0);

      const res = await request(app)
        .get('/api/applications?page=-1&limit=999')
        .set('Authorization', `Bearer ${validToken}`);
      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(100);
    });
  });

  describe('Workflow', () => {
    it('POST /api/applications/:id/submit submits application (must be DRAFT)', async () => {
      mockPrisma.application.findUnique.mockResolvedValue(mockDraftApp);
      mockPrisma.application.update.mockResolvedValue({ ...mockDraftApp, status: 'SUBMITTED' });

      const res = await request(app)
        .post('/api/applications/app-1/submit')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          applicantName: 'John Doe',
          pan: 'ABCDE1234F',
          email: 'john@example.com',
          address: '123 Main St',
          occupation: 'Software Engineer',
          monthlyIncome: '75000',
          loanAmount: '500000',
          employer: 'Tech Corp',
        });

      expect(res.status).toBe(200);
    });

    it('POST /api/applications/:id/approve approves application (policy manager)', async () => {
      mockPrisma.application.findUnique.mockResolvedValue(mockSubmittedApp);
      mockPrisma.application.update.mockResolvedValue({ ...mockSubmittedApp, status: 'APPROVED' });

      const res = await request(app)
        .post('/api/applications/app-1/approve')
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);
    });

    it('POST /api/applications/:id/approve returns 403 for applicant', async () => {
      const res = await request(app)
        .post('/api/applications/app-1/approve')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(403);
    });

    it('POST /api/applications/:id/reject rejects application', async () => {
      mockPrisma.application.findUnique.mockResolvedValue(mockSubmittedApp);
      mockPrisma.application.update.mockResolvedValue({ ...mockSubmittedApp, status: 'REJECTED' });

      const res = await request(app)
        .post('/api/applications/app-1/reject')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({ reason: 'Insufficient income' });

      expect(res.status).toBe(200);
    });

    it('POST /api/applications/:id/escalate escalates application', async () => {
      mockPrisma.application.findUnique.mockResolvedValue(mockSubmittedApp);
      mockPrisma.application.update.mockResolvedValue({ ...mockSubmittedApp, status: 'ESCALATED' });

      const res = await request(app)
        .post('/api/applications/app-1/escalate')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({ reason: 'Needs higher approval' });

      expect(res.status).toBe(200);
    });

    it('POST /api/applications/:id/withdraw withdraws application', async () => {
      mockPrisma.application.findUnique.mockResolvedValue(mockSubmittedApp);
      mockPrisma.application.update.mockResolvedValue({ ...mockSubmittedApp, status: 'DRAFT' });

      const res = await request(app)
        .post('/api/applications/app-1/withdraw')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
    });

    it('POST /api/applications/:id/submit returns 400 for already submitted application', async () => {
      mockPrisma.application.findUnique.mockResolvedValue(mockSubmittedApp);
      const res = await request(app)
        .post('/api/applications/app-1/submit')
        .set('Authorization', `Bearer ${validToken}`);
      expect(res.status).toBe(400);
    });

    it('POST /api/applications/:id/approve returns 404 for non-existent application', async () => {
      mockPrisma.application.findUnique.mockResolvedValue(null);
      const res = await request(app)
        .post('/api/applications/nonexistent/approve')
        .set('Authorization', `Bearer ${pmToken}`);
      expect(res.status).toBe(404);
    });

    it('POST /api/applications/:id/approve returns 400 for wrong status (DRAFT)', async () => {
      mockPrisma.application.findUnique.mockResolvedValue(mockDraftApp);
      const res = await request(app)
        .post('/api/applications/app-1/approve')
        .set('Authorization', `Bearer ${pmToken}`);
      expect(res.status).toBe(400);
    });

    it('POST /api/applications/:id/reject returns 400 for missing reason', async () => {
      mockPrisma.application.findUnique.mockResolvedValue(mockSubmittedApp);
      const res = await request(app)
        .post('/api/applications/app-1/reject')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it('POST /api/applications/:id/reject returns 400 for empty reason', async () => {
      mockPrisma.application.findUnique.mockResolvedValue(mockSubmittedApp);
      const res = await request(app)
        .post('/api/applications/app-1/reject')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({ reason: '   ' });
      expect(res.status).toBe(400);
    });

    it('POST /api/applications/:id/escalate returns 400 for missing reason', async () => {
      mockPrisma.application.findUnique.mockResolvedValue(mockSubmittedApp);
      const res = await request(app)
        .post('/api/applications/app-1/escalate')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it('POST /api/applications/:id/withdraw returns 400 for non-SUBMITTED application', async () => {
      mockPrisma.application.findUnique.mockResolvedValue(mockDraftApp);
      const res = await request(app)
        .post('/api/applications/app-1/withdraw')
        .set('Authorization', `Bearer ${validToken}`);
      expect(res.status).toBe(400);
    });

    it('POST /api/applications/:id/withdraw returns 403 for another user\'s application', async () => {
      mockPrisma.application.findUnique.mockResolvedValue(mockOtherUserApp);
      const res = await request(app)
        .post('/api/applications/app-other/withdraw')
        .set('Authorization', `Bearer ${validToken}`);
      expect(res.status).toBe(403);
    });

    it('POST /api/applications/:id/approve works for MAIN_MANAGER on ESCALATED application', async () => {
      mockPrisma.application.findUnique.mockResolvedValue(mockEscalatedApp);
      mockPrisma.application.update.mockResolvedValue({ ...mockEscalatedApp, status: 'APPROVED' });

      const res = await request(app)
        .post('/api/applications/app-esc-1/approve')
        .set('Authorization', `Bearer ${mmToken}`);
      expect(res.status).toBe(200);
    });

    it('POST /api/applications/:id/reject works for MAIN_MANAGER on ESCALATED application', async () => {
      mockPrisma.application.findUnique.mockResolvedValue(mockEscalatedApp);
      mockPrisma.application.update.mockResolvedValue({ ...mockEscalatedApp, status: 'REJECTED' });

      const res = await request(app)
        .post('/api/applications/app-esc-1/reject')
        .set('Authorization', `Bearer ${mmToken}`)
        .send({ reason: 'Not suitable' });
      expect(res.status).toBe(200);
    });

    it('POST /api/applications/:id/escalate returns 403 for MAIN_MANAGER', async () => {
      const res = await request(app)
        .post('/api/applications/app-1/escalate')
        .set('Authorization', `Bearer ${mmToken}`)
        .send({ reason: 'Needs review' });
      expect(res.status).toBe(403);
    });
  });

  describe('Access Control', () => {
    it('GET /api/applications/audit-logs returns 403 for non-main-manager', async () => {
      const res = await request(app)
        .get('/api/applications/audit-logs')
        .set('Authorization', `Bearer ${validToken}`);
      expect(res.status).toBe(403);
    });

    it('GET /api/applications/audit-logs returns 200 for main manager', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      const res = await request(app)
        .get('/api/applications/audit-logs')
        .set('Authorization', `Bearer ${mmToken}`);
      expect(res.status).toBe(200);
    });

    it('GET /api/applications/:id/history returns history', async () => {
      mockPrisma.applicationHistory.findMany.mockResolvedValue([]);
      const res = await request(app)
        .get('/api/applications/app-1/history')
        .set('Authorization', `Bearer ${validToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe('Route Ordering', () => {
    it('GET /api/applications/audit-logs matches audit-logs route, not :id', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      const res = await request(app)
        .get('/api/applications/audit-logs')
        .set('Authorization', `Bearer ${mmToken}`);
      expect(res.status).toBe(200);
    });

    it('GET /api/applications/dashboard matches dashboard route, not :id', async () => {
      mockPrisma.application.findMany.mockResolvedValue([]);
      const res = await request(app)
        .get('/api/applications/dashboard')
        .set('Authorization', `Bearer ${validToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe('Dashboard', () => {
    it('GET /api/applications/dashboard returns applicant dashboard', async () => {
      mockPrisma.application.findMany.mockResolvedValue([mockSubmittedApp]);

      const res = await request(app)
        .get('/api/applications/dashboard')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.totalApplications).toBe(1);
    });

    it('GET /api/applications/dashboard returns policy manager dashboard', async () => {
      mockPrisma.application.findMany.mockResolvedValue([mockSubmittedApp]);

      const res = await request(app)
        .get('/api/applications/dashboard')
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(200);
    });

    it('GET /api/applications/dashboard returns main manager dashboard', async () => {
      mockPrisma.application.findMany.mockResolvedValue([mockSubmittedApp]);

      const res = await request(app)
        .get('/api/applications/dashboard')
        .set('Authorization', `Bearer ${mmToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Unknown Role', () => {
    it('GET /api/applications/dashboard returns 400 for unknown role', async () => {
      const res = await request(app)
        .get('/api/applications/dashboard')
        .set('Authorization', 'Bearer unknown');
      expect(res.status).toBe(400);
    });
  });
});
