export type Role = 'APPLICANT' | 'POLICY_MANAGER' | 'MAIN_MANAGER';

export type ApplicationStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'ESCALATED';

export interface User {
  id: string;
  username: string;
  email: string;
  role: Role;
  enabled: boolean;
}

export interface LoginResponse {
  token: string;
  username: string;
  email: string;
  role: Role;
}

export interface Application {
  id: string;
  applicationNo: number;
  userId: string;
  status: ApplicationStatus;
  pdfPath?: string;
  pdfName?: string;
  pdfSize?: number;
  applicantName?: string;
  dob?: string;
  gender?: string;
  pan?: string;
  aadhaar?: string;
  phone?: string;
  email?: string;
  address?: string;
  occupation?: string;
  employer?: string;
  monthlyIncome?: number;
  loanAmount?: number;
  loanPurpose?: string;
  bankDetails?: string;
  escalationReason?: string;
  rejectReason?: string;
  riskScore?: number;
  riskLevel?: string;
  policyManagerId?: string;
  mainManagerId?: string;
  createdAt: string;
  submittedAt?: string;
  documents: Document[];
  extractedFields: ExtractedField[];
  riskAssessment?: RiskAssessment;
  applicationHistory: ApplicationHistory[];
  user: { username: string; email: string };
}

export interface Document {
  id: string;
  applicationId: string;
  fileName: string;
  fileSize: number;
  filePath: string;
}

export interface ExtractedField {
  id: string;
  fieldName: string;
  fieldValue: string;
  confidence: number;
  needsVerification: boolean;
}

export interface RiskAssessment {
  id: string;
  riskScore: number;
  fraudProbability: number;
  missingDocuments: string;
  documentQuality: string;
  confidenceScore: number;
  policyRecommendation: string;
  approvalProbability: number;
  aiSummary: string;
  incomeVerified: boolean;
  employmentVerified: boolean;
  creditAssessment: string;
}

export interface ApplicationHistory {
  id: string;
  status: string;
  action: string;
  performedBy: string;
  performedByRole: string;
  reason?: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface ApplicantDashboard {
  pendingDrafts: number;
  submittedApplications: number;
  totalApplications: number;
  lastSubmittedDate: string | null;
  recentActivity: Application[];
}

export interface PolicyDashboard {
  pendingApplications: number;
  reviewedToday: number;
  escalatedCases: number;
  approvedCases: number;
  rejectedCases: number;
}

export interface MainDashboard {
  pendingEscalated: number;
  approvedCases: number;
  rejectedCases: number;
  totalApprovedLoans: number;
}
