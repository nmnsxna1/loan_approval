# 🏦 Loan Approval System

A comprehensive loan application processing system with **AI-powered PDF data extraction**, **risk assessment**, and **multi-level approval workflow**.

---

## 📋 Table of Contents

- [System Overview](#-system-overview)
- [Architecture](#-architecture)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [Configuration Guide](#-configuration-guide)
- [Database Schema](#-database-schema)
- [API Endpoints](#-api-endpoints)
- [Application Workflow](#-application-workflow)
- [Code Logic & Modules](#-code-logic--modules)
- [LLM / AI Integration](#-llm--ai-integration)
- [Role-Based Access Control](#-role-based-access-control)
- [Testing](#-testing)
- [Deployment](#-deployment)

---

## 🎯 System Overview

The Loan Approval System automates the entire loan lifecycle:

1. **Upload** - Applicant uploads a PDF containing loan application details
2. **Extract** - AI/LLM extracts structured data from the PDF
3. **Validate** - Business rules validate extracted data (PAN, income, age, etc.)
4. **Risk Assess** - AI calculates risk score and generates a risk analysis
5. **Review** - Policy Manager reviews submitted applications
6. **Escalate/Approve/Reject** - Multi-level approval workflow
7. **Notify** - Email notifications on status changes (Java backend)

The system comes in **two backend implementations** (for flexibility):
- **Node.js Backend** (Express + Prisma) - Primary, fully tested
- **Java Backend** (Spring Boot + JPA) - Alternative implementation

Both backends share the same **React Frontend** and can be used interchangeably.

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│                  (Vite + React 19)                       │
│                      Port 3001                           │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP (API calls)
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Node.js Backend (Primary)                   │
│              Express + Prisma ORM                        │
│                   Port 8080                              │
│                                                          │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────────┐  │
│  │ Auth     │  │ Application│  │ AI Service           │  │
│  │ (JWT)    │  │ CRUD +     │  │ (LLM Extraction +    │  │
│  │          │  │ Workflow   │  │  Risk Analysis)      │  │
│  └──────────┘  └───────────┘  └──────────────────────┘  │
│                                                          │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────────┐  │
│  │ Upload   │  │ Validation│  │ Logging              │  │
│  │ (Multer) │  │ Engine    │  │ (File + Console)     │  │
│  └──────────┘  └───────────┘  └──────────────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  PostgreSQL Database                      │
│                                                          │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────────┐  │
│  │ Users    │  │Applications│  │ Risk Assessments     │  │
│  │          │  │ + History  │  │ + Extracted Fields   │  │
│  └──────────┘  └───────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Alternative: Java Backend** (Spring Boot + JPA/Hibernate) runs on port 8080 instead of the Node.js backend.

---

## 📦 Prerequisites

| Tool    | Version      | Purpose                         |
|---------|-------------|----------------------------------|
| Node.js | >= 18.x     | Runtime for Node backend & frontend |
| npm     | >= 9.x      | Package manager                  |
| Java    | >= 21       | For Java backend (optional)      |
| Maven   | >= 3.9      | For Java backend (optional)      |
| PostgreSQL | >= 14   | Database for both backends       |
| LLM API Key | -        | For AI features (Gemini/OpenAI)  |

---

## 🚀 Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <repo-url>
cd loan_approval

# Install Node.js backend dependencies
cd loan-approval-backend-node
npm install

# Install frontend dependencies
cd ../loan-approval-frontend
npm install

# Return to project root
cd ..
```

### 2. Configure Environment

```bash
# Copy example env files and edit them with your settings

# Node.js backend env
cp loan-approval-backend-node/.env.example loan-approval-backend-node/.env
# Edit: DATABASE_URL, JWT_SECRET

# Frontend env
cp loan-approval-frontend/.env.example loan-approval-frontend/.env

# LLM configuration (if using AI features)
cp llm.json.example llm.json
# Edit: Set 'active' provider and fill in apiKey
```

### 3. Setup Database

```bash
# Create the PostgreSQL database
createdb loan_approval_db

# Generate Prisma client and push schema
cd loan-approval-backend-node
npx prisma generate
npx prisma db push

# Seed demo users
npm run seed
```

### 4. Start the Application

```bash
# Option A: Using start.bat (Windows)
.\start.bat

# Option B: Manual start (3 terminals)

# Terminal 1 - Node.js Backend
cd loan-approval-backend-node
npm run dev

# Terminal 2 - Frontend
cd loan-approval-frontend
npm run dev

# Access the app at: http://localhost:3001
```

### Demo Credentials

| Role            | Username     | Password    |
|----------------|-------------|------------|
| Applicant      | applicant1  | password123 |
| Policy Manager | policymgr1  | password123 |
| Main Manager   | mainmgr1    | password123 |

---

## 📁 Project Structure

```
loan_approval/
├── README.md                         # This file
├── llm.json                          # LLM config (active)
├── llm.json.example                  # LLM config template
├── start.bat                         # Windows startup script
├── testing.md                        # Test results report
│
├── loan-approval-backend-node/       # 🟢 NODE.JS BACKEND
│   ├── .env.example                  # Environment template
│   ├── package.json                  # Dependencies & scripts
│   ├── tsconfig.json                 # TypeScript config
│   ├── llm.json                      # LLM config (copy)
│   ├── prisma/
│   │   └── schema.prisma             # Database schema
│   ├── uploads/                      # Uploaded PDFs
│   ├── sample-pdfs/                  # Sample PDFs for testing
│   └── src/
│       ├── index.ts                  # Server entry point
│       ├── app.ts                    # Express app setup
│       ├── seed.ts                   # Database seeder
│       ├── config/
│       │   ├── auth.ts               # Roles & statuses constants
│       │   └── llm.ts               # LLM config loader
│       ├── controllers/
│       │   ├── authController.ts     # Login handler
│       │   ├── applicationController.ts  # CRUD + workflow
│       │   └── uploadController.ts   # File upload handler
│       ├── routes/
│       │   ├── auth.ts               # Auth routes
│       │   ├── applications.ts       # Application routes
│       │   └── upload.ts             # Upload routes
│       ├── middleware/
│       │   ├── auth.ts               # JWT auth middleware
│       │   ├── upload.ts             # Multer upload config
│       │   └── errorHandler.ts       # Global error handler
│       ├── services/
│       │   ├── aiService.ts          # LLM extraction + risk
│       │   ├── validationEngine.ts   # Business rule validation
│       │   └── workflowService.ts    # App state transitions
│       ├── utils/
│       │   ├── jwt.ts                # JWT generation/verification
│       │   ├── logger.ts             # Structured logging
│       │   └── prisma.ts             # Prisma client singleton
│       └── __tests__/
│           └── api.test.ts           # API integration tests
│
├── loan-approval-backend/            # 🔵 JAVA BACKEND (Spring Boot)
│   ├── pom.xml                       # Maven build config
│   ├── schema.sql                    # Database schema SQL
│   ├── .env.example                  # Environment template
│   └── src/main/
│       ├── java/com/loan/approval/
│       │   ├── LoanApprovalApplication.java  # Main class
│       │   ├── config/
│       │   │   ├── AppConfig.java            # RestTemplate bean
│       │   │   ├── SecurityConfig.java        # Spring Security
│       │   │   ├── FileStorageProperties.java # Upload config
│       │   │   └── LlmConfigLoader.java       # LLM JSON loader
│       │   ├── security/
│       │   │   ├── JwtTokenProvider.java      # JWT utilities
│       │   │   ├── JwtAuthenticationFilter.java
│       │   │   └── CustomUserDetailsService.java
│       │   ├── controller/
│       │   │   ├── AuthController.java        # Login/Register
│       │   │   ├── LoanApplicationController.java  # CRUD
│       │   │   └── UploadController.java      # File upload
│       │   ├── service/
│       │   │   ├── AuthService.java
│       │   │   ├── AIService.java             # LLM extraction
│       │   │   ├── ValidationEngine.java      # Rule validation
│       │   │   ├── WorkflowService.java       # Status transitions
│       │   │   └── FileStorageService.java    # File handling
│       │   ├── entity/
│       │   │   ├── User.java                  # JPA entity
│       │   │   ├── Role.java                  # Enum
│       │   │   ├── LoanApplication.java       # JPA entity
│       │   │   ├── AuditLog.java              # JPA entity
│       │   │   └── ValidationError.java       # JPA entity
│       │   ├── dto/                           # Request/Response DTOs
│       │   ├── repository/                    # Spring Data repos
│       │   ├── email/
│       │   │   └── EmailService.java          # Email notifications
│       │   ├── ai/
│       │   │   └── AiService.java             # AI processing
│       │   └── util/
│       │       └── GenerateSamplePdfs.java    # PDF generator
│       └── resources/
│           └── application.properties         # Spring config
│
└── loan-approval-frontend/           # ⚛️ REACT FRONTEND
    ├── .env.example                  # Environment template
    ├── package.json                  # Dependencies
    ├── vite.config.ts                # Vite + proxy config
    ├── tailwind.config.js            # Tailwind CSS config
    ├── tsconfig.json                 # TypeScript config
    └── src/
        ├── main.tsx                  # App entry point
        ├── App.tsx                   # Routes + providers
        ├── index.css                 # Tailwind imports
        ├── api/
        │   └── axios.ts              # Axios instance with interceptors
        ├── context/
        │   ├── AuthContext.tsx        # Auth state management
        │   └── ThemeContext.tsx       # Dark/light theme
        ├── components/
        │   ├── Layout.tsx            # App shell with sidebar
        │   ├── Navbar.tsx            # Top navigation
        │   ├── Sidebar.tsx           # Role-based sidebar
        │   ├── ProtectedRoute.tsx    # Role-based route guard
        │   ├── StatusBadge.tsx       # Application status chip
        │   ├── SearchBar.tsx         # Reusable search input
        │   ├── Pagination.tsx        # Pagination controls
        │   ├── ConfirmDialog.tsx     # Confirmation modal
        │   ├── EmptyState.tsx        # Empty data placeholder
        │   ├── LoadingSkeleton.tsx   # Loading animation
        │   └── ErrorBoundary.tsx     # React error boundary
        ├── pages/
        │   ├── Login.tsx             # Login page
        │   ├── applicant/
        │   │   ├── Dashboard.tsx     # Applicant dashboard
        │   │   ├── NewApplication.tsx # Upload/create application
        │   │   └── MyApplications.tsx # View owned applications
        │   ├── policy-manager/
        │   │   ├── Dashboard.tsx     # PM dashboard
        │   │   ├── ReviewApplications.tsx  # Review queue
        │   │   └── SearchApplications.tsx  # Search all apps
        │   └── main-manager/
        │       ├── Dashboard.tsx     # MM dashboard
        │       ├── EscalatedCases.tsx # Review escalated apps
        │       └── SearchApplications.tsx  # Search all apps
        ├── hooks/
        │   └── useDebounce.ts        # Debounce hook for search
        ├── types/
        │   └── index.ts              # Shared TypeScript types
        └── utils/
            ├── logger.ts             # Frontend logger
            └── uploadUrl.ts          # Upload URL helper
```

---

## ⚙️ Configuration Guide

### Environment Files

The system uses environment variables for runtime configuration.
Each module has its own `.env.example` file with detailed comments.

#### Node.js Backend (`loan-approval-backend-node/.env`)

| Variable          | Required | Default | Description |
|------------------|----------|---------|-------------|
| `DATABASE_URL`   | ✅ YES   | -       | PostgreSQL connection string |
| `PORT`           | No       | 8080    | Server port |
| `JWT_SECRET`     | ✅ YES   | -       | JWT signing secret (throws error if missing) |
| `JWT_EXPIRES_IN` | No       | 24h     | Token expiration time |
| `UPLOAD_DIR`     | No       | uploads | PDF storage directory |
| `LOG_LEVEL`      | No       | info    | Logging verbosity |
| `LOG_PATH`       | No       | ../logs | Log file directory |

#### Frontend (`loan-approval-frontend/.env`)

| Variable             | Required | Default | Description |
|---------------------|----------|---------|-------------|
| `VITE_UPLOADS_URL`  | No       | ''      | Base URL for uploaded files |
| `VITE_LOG_LEVEL`    | No       | info    | Console log level |
| `VITE_LOG_ENDPOINT` | No       | ''      | Remote log endpoint (for errors) |

#### Java Backend (`loan-approval-backend/.env`)

| Variable             | Required | Default | Description |
|---------------------|----------|---------|-------------|
| `DB_HOST`           | No       | localhost | Database host |
| `DB_PORT`           | No       | 5432    | Database port |
| `DB_NAME`           | No       | loan_approval_db | Database name |
| `DB_USERNAME`       | ✅ YES   | postgres | Database username |
| `DB_PASSWORD`       | ✅ YES   | 1234    | Database password |
| `MAIL_HOST`         | No       | smtp.gmail.com | SMTP server |
| `MAIL_PORT`         | No       | 587     | SMTP port |
| `MAIL_USERNAME`     | No       | ''      | SMTP username |
| `MAIL_PASSWORD`     | No       | ''      | SMTP password |

### LLM Configuration (`llm.json`)

Controls which AI/LLM provider is used for PDF data extraction and risk analysis.
See [LLM / AI Integration](#-llm--ai-integration) section for details.

---

## 🗄 Database Schema

### Entity Relationship Diagram

```
┌───────────────────┐       ┌──────────────────────────┐
│       User        │       │     Application           │
├───────────────────┤       ├──────────────────────────┤
│ id (PK)           │◄──────┤ userId (FK)              │
│ username (UQ)     │       │ id (PK)                  │
│ password (bcrypt) │       │ applicationNo (UQ, auto) │
│ email (UQ)        │       │ status: DRAFT/SUBMITTED/  │
│ role: APPLICANT/  │       │   UNDER_REVIEW/APPROVED/  │
│   POLICY_MANAGER/ │       │   REJECTED/ESCALATED     │
│   MAIN_MANAGER    │       │ pdfPath, pdfName, pdfSize │
│ enabled           │       │ applicantName, dob, gender│
│ createdAt         │       │ pan, aadhaar, phone, email│
│ updatedAt         │       │ address, occupation, etc.│
└───┬───────────────┘       │ monthlyIncome, loanAmount │
    │                       │ loanPurpose, bankDetails  │
    │ (policyManager)       │ escalationReason          │
    ├──────────────────────►│ rejectReason              │
    │ (mainManager)         │ policyManagerId (FK)      │
    ├──────────────────────►│ mainManagerId (FK)        │
    │                       │ createdAt, updatedAt      │
    │                       │ submittedAt               │
    │                       │ policyDecidedAt           │
    │                       │ mainDecidedAt             │
    │                       └───────────┬──────────────┘
    │                                   │
    │                                   │ 1
    │                        ┌──────────┴──────────┐
    │                        │   RiskAssessment     │
    │                        ├──────────────────────┤
    │                        │ id (PK)              │
    │                        │ applicationId (UQ,FK)│
    │                        │ riskScore (0-100)   │
    │                        │ fraudProbability     │
    │                        │ missingDocuments     │
    │                        │ documentQuality      │
    │                        │ confidenceScore      │
    │                        │ policyRecommendation │
    │                        │ approvalProbability  │
    │                        │ aiSummary            │
    │                        │ incomeVerified       │
    │                        │ employmentVerified   │
    │                        │ creditAssessment     │
    │                        └──────────────────────┘
    │                                   │
    │                                   │ *
    │                        ┌──────────┴──────────┐
    │                        │   ExtractedField     │
    │                        ├──────────────────────┤
    │                        │ id (PK)              │
    │                        │ applicationId (FK)   │
    │                        │ fieldName            │
    │                        │ fieldValue           │
    │                        │ confidence (0-1)    │
    │                        │ needsVerification    │
    │                        └──────────────────────┘
    │                                   │
    │                                   │ *
    │                        ┌──────────┴──────────┐
    │                        │  ApplicationHistory  │
    │                        ├──────────────────────┤
    │                        │ id (PK)              │
    │                        │ applicationId (FK)   │
    │ *                      │ status               │
    ├────────────────────────┤ action               │
    │                        │ performedBy          │
    │                        │ performedByRole      │
    │                        │ reason               │
    │                        │ createdAt            │
    │                        └──────────────────────┘
    │                                   │
    │                                   │ *
    │                        ┌──────────┴──────────┐
    │                        │      AuditLog        │
    │                        ├──────────────────────┤
    │                        │ id (PK)              │
    │◄───────────────────────┤ userId (FK)          │
    │                        │ applicationId (FK)   │
    │                        │ action               │
    │                        │ details              │
    │                        │ performedBy          │
    │                        │ performedByRole      │
    │                        │ ipAddress            │
    │                        │ createdAt            │
    │                        └──────────────────────┘
    │                                   │
    │                                   │ *
    │                        ┌──────────┴──────────┐
    │                        │      Document        │
    │                        ├──────────────────────┤
    │                        │ id (PK)              │
    │                        │ applicationId (FK)   │
    │                        │ filePath             │
    │                        │ fileName             │
    │                        │ fileSize             │
    │                        │ documentType         │
    │                        │ uploadedAt           │
    │                        └──────────────────────┘
```

### Key Tables

- **users** - User accounts with roles (APPLICANT, POLICY_MANAGER, MAIN_MANAGER)
- **applications** - Loan applications with status tracking and applicant data
- **risk_assessments** - AI-generated risk analysis (one per application)
- **extracted_fields** - Individual fields extracted from PDF by LLM
- **application_history** - Status change history (timeline)
- **audit_logs** - Security audit trail
- **documents** - Uploaded PDF file references

---

## 🌐 API Endpoints

### Authentication

| Method | Endpoint         | Auth Required | Description |
|--------|-----------------|---------------|-------------|
| POST   | `/api/auth/login` | No           | Login with username/password |

### Applications (All require JWT auth)

| Method | Endpoint                          | Role Access          | Description |
|--------|----------------------------------|----------------------|-------------|
| GET    | `/api/applications/dashboard`    | All roles            | Get role-specific dashboard stats |
| GET    | `/api/applications`              | All roles            | List applications (paginated) |
| GET    | `/api/applications/:id`          | All roles            | Get application details |
| POST   | `/api/applications`              | APPLICANT            | Create new draft application |
| PUT    | `/api/applications/:id`          | APPLICANT            | Update draft application |
| DELETE | `/api/applications/:id`          | APPLICANT            | Delete draft application |
| POST   | `/api/applications/:id/submit`   | APPLICANT            | Submit for review |
| POST   | `/api/applications/:id/approve`  | POLICY_MANAGER, MAIN_MANAGER | Approve application |
| POST   | `/api/applications/:id/reject`   | POLICY_MANAGER, MAIN_MANAGER | Reject with reason |
| POST   | `/api/applications/:id/escalate` | POLICY_MANAGER      | Escalate to Main Manager |
| POST   | `/api/applications/:id/withdraw` | APPLICANT            | Withdraw submission back to draft |
| GET    | `/api/applications/:id/history`  | All roles            | Get application timeline |
| GET    | `/api/applications/audit-logs`   | MAIN_MANAGER         | Get audit log entries |

### File Upload

| Method | Endpoint         | Auth Required | Description |
|--------|-----------------|---------------|-------------|
| POST   | `/api/upload`    | Yes           | Upload PDF (auto-extracts data) |
| GET    | `/uploads/:file` | Yes           | Serve uploaded PDF files |

### Health & Debug

| Method | Endpoint           | Auth Required | Description |
|--------|-------------------|---------------|-------------|
| GET    | `/api/health`      | No            | Health check |
| GET    | `/api/debug/llm`   | No (dev only) | Test LLM extraction |
| GET    | `/api/debug/pdf-text` | No (dev only) | Extract raw PDF text |

---

## 🔄 Application Workflow

### State Machine

```
                          ┌──────────┐
                          │  DRAFT   │
                          └────┬─────┘
                               │
                         [Applicant Submits]
                               │
                               ▼
                        ┌──────────────┐
                        │  SUBMITTED   │◄────┐
                        └──────┬───────┘     │
                               │              │
                    ┌──────────┼──────────┐   │
                    │          │          │   │
                    ▼          ▼          ▼   │
              ┌─────────┐ ┌────────┐ ┌──────────┐
              │ APPROVED│ │REJECTED│ │ESCALATED │
              │ (Policy)│ │(Policy)│ └────┬─────┘
              └─────────┘ └────────┘      │
                                          │
                                    [Main Manager]
                                          │
                                    ┌─────┴─────┐
                                    │           │
                                    ▼           ▼
                              ┌─────────┐ ┌────────┐
                              │ APPROVED│ │REJECTED│
                              │  (Main) │ │ (Main) │
                              └─────────┘ └────────┘
```

### Workflow Rules

1. **DRAFT → SUBMITTED**: Applicant submits the application. Validation runs automatically.
2. **SUBMITTED → APPROVED**: Policy Manager reviews and approves.
3. **SUBMITTED → REJECTED**: Policy Manager rejects with a reason.
4. **SUBMITTED → ESCALATED**: Policy Manager escalates to Main Manager (with reason).
5. **ESCALATED → APPROVED**: Main Manager approves the escalated case.
6. **ESCALATED → REJECTED**: Main Manager rejects the escalated case.
7. **SUBMITTED → DRAFT**: Applicant withdraws the submission (back to draft).
8. **DRAFT → (deleted)**: Applicant can delete draft applications entirely.

### Role Permissions

| Action                    | APPLICANT | POLICY_MANAGER | MAIN_MANAGER |
|--------------------------|:---------:|:--------------:|:------------:|
| Create Draft             |     ✅    |       ❌       |      ❌      |
| Edit Draft               |     ✅    |       ❌       |      ❌      |
| Delete Draft             |     ✅    |       ❌       |      ❌      |
| Submit for Review        |     ✅    |       ❌       |      ❌      |
| Withdraw Submission      |     ✅    |       ❌       |      ❌      |
| View Own Applications    |     ✅    |       ❌       |      ❌      |
| Review All Applications  |     ❌    |       ✅       |      ✅      |
| Approve/Reject           |     ❌    |       ✅       |      ✅      |
| Escalate to Main Manager |     ❌    |       ✅       |      ❌      |
| View Audit Logs          |     ❌    |       ❌       |      ✅      |

---

## 🔧 Code Logic & Modules

### Node.js Backend

#### `app.ts` - Express Application Setup
- Configures CORS for localhost origins (3000, 3001, 5173)
- Adds request ID (UUID) to every request for tracing
- Logs all API requests with method, URL, status code, and duration
- Routes: `/api/auth`, `/api/applications`, `/api/upload`
- Serves static uploads via `/uploads` (with JWT auth)
- Health check at `GET /api/health`
- Debug endpoints (`/api/debug/llm`, `/api/debug/pdf-text`) only in non-production
- Global error handler catches all unhandled errors

#### `controllers/applicationController.ts` - Application CRUD & Workflow
- **getDashboard**: Returns role-specific dashboard stats
  - APPLICANT: draft count, submitted count, recent activity
  - POLICY_MANAGER: pending, reviewed today, escalated, approved, rejected counts
  - MAIN_MANAGER: pending escalated, approved, rejected, total approved
- **getApplications**: Paginated list with optional search and status filter
- **getApplicationById**: Full application details with documents, extracted fields, risk assessment, history
- **createApplication**: Creates new draft application with DRAFT status
- **updateApplication**: Updates only DRAFT applications
- **handleSubmit**: Updates application data, validates, and transitions to SUBMITTED
- **handleApprove**: Approves via Policy Manager or Main Manager
- **handleReject**: Rejects with mandatory reason
- **handleEscalate**: Escalates to Main Manager with reason
- **handleDelete**: Deletes draft applications (cascades to related records)
- **handleWithdraw**: Returns submitted application back to DRAFT
- **getHistory**: Returns application timeline
- **getAuditLogs**: Returns audit trail (Main Manager only, capped at 100)

#### `controllers/authController.ts` - Authentication
- **login**: Validates credentials with Zod, checks bcrypt password, returns JWT token
- Input validation via Zod schema (rejects empty/missing fields)
- Returns unified error message for both "user not found" and "wrong password" (security best practice)

#### `controllers/uploadController.ts` - File Upload & AI Processing
- Accepts PDF files via Multer middleware
- Creates application record in DRAFT status
- Creates document record for the uploaded file
- Triggers AI extraction (PDF parsing + LLM extraction + risk analysis)
- Updates application with extracted fields and risk assessment
- Creates extracted_field records with confidence scores
- Creates risk_assessment record with full analysis
- Falls back gracefully: if AI fails, returns partial success message

#### `services/aiService.ts` - AI/LLM Integration
- **extractFromPdf**: Two-phase AI pipeline
  1. **PDF Text Extraction**: Uses `pdf-parse` library, with fallback to simple text extractor
  2. **LLM Extraction Call**: Sends PDF text to LLM with structured prompt, parses JSON response
  3. **LLM Risk Analysis Call**: Sends same text for risk analysis, parses JSON response
- **callLlm**: Generic LLM caller with:
  - Retry logic (2 attempts with 2s delay)
  - Timeout handling (auto-detected: 1hr for local, 1min for remote)
  - Provider-agnostic request building (OpenAI, Anthropic, Gemini, Ollama)
  - Response parsing per provider format
- **getFallbackData**: Returns hardcoded fallback when LLM fails (for development)

#### `services/validationEngine.ts` - Business Rule Validation
Validates extracted data against business rules:
- PAN format: `AAAAA9999A` regex validation
- Email format: Standard email regex
- Phone: Indian 10-digit mobile number (starts with 6-9)
- Aadhaar: 12-digit number
- Monthly Income: Must be >= ₹25,000
- Loan Amount: Must not exceed 60x monthly income
- Occupation: Must match recognized occupation list
- All required fields must be present (name, PAN, email, address, occupation, employer)

Risk Score Calculation:
- Base score from validation pass (20 points)
- Age-based scoring (25-45 = 15pts, 46-55 = 10pts, others = 5pts)
- Income-based scoring (>=100k = 25pts, >=50k = 20pts, else 10pts)
- Loan-to-income ratio scoring (<=2x annual = 20pts, <=4x = 15pts, else 5pts)
- Occupation-based scoring (Engineer/Doctor = 10pts, Manager = 8pts, else 5pts)
- Additional points for employer and address presence
- Max score: 100

#### `services/workflowService.ts` - State Machine Logic
- **submitApplication**: Validates DRAFT status, transitions to SUBMITTED
- **approveApplication**: Role-specific approval with validation
- **rejectApplication**: Mandatory reason, role-specific rejection
- **escalateApplication**: Transitions to ESCALATED with reason
- **addHistory**: Records status change timeline
- **createAuditLog**: Records security audit entries

#### `middleware/auth.ts` - JWT Authentication
- **authenticate**: Extracts Bearer token from Authorization header, verifies JWT, attaches user to request
- **authorize**: Role-based access control middleware, checks user role against allowed roles

#### `utils/logger.ts` - Structured Logging
- File-based logging with daily rotation
- Multiple log types: BACKEND, API, DATABASE, AUTHENTICATION, ERROR, PERFORMANCE
- Log levels: DEBUG, INFO, WARN, ERROR, FATAL
- Automatic caller detection (file, function, line number)
- Sensitive data masking (passwords, tokens, API keys)
- Color-coded console output
- Async writes for non-critical logs, sync writes for errors

#### `utils/jwt.ts` - JWT Utilities
- Token generation with configurable expiration
- Token verification with signature validation
- Throws error if JWT_SECRET env var is missing

#### `utils/prisma.ts` - Database Client
- PrismaClient singleton pattern (avoids connection pool exhaustion)

---

### Java Backend

#### Architecture (Spring Boot)
- **SecurityConfig.java**: Spring Security config with JWT filter, CORS, stateless sessions
- **LlmConfigLoader.java**: Loads llm.json config file with provider fallback logic
- **WorkflowService.java**: Transactional status transitions with audit logging and email notifications
- **ValidationEngine.java**: Business rule validation with risk scoring (same rules as Node.js)
- **AIService.java**: LLM integration via RestTemplate, supports Gemini/Ollama/OpenAI formats
- **EmailService.java**: SMTP email notifications on status changes

#### Key Java-Specific Features
- **Email notifications**: Sends status update emails to applicants on rejections/approvals
- **Transactional workflows**: Spring @Transactional for atomic status transitions
- **Hibernate ORM**: JPA entities with automatic schema generation
- **Gson**: JSON parsing for LLM responses
- **PDFBox**: Direct PDF text extraction (alternative to pdf-parse)

---

### React Frontend

#### State Management
- **AuthContext**: JWT token + user state with localStorage persistence
  - Login stores token and user data in localStorage
  - On mount, restores session from localStorage (with try/catch for corrupted data)
  - Logout clears storage and redirects to login
- **ThemeContext**: Dark/light mode toggle with localStorage persistence

#### API Communication
- **Axios Instance**: Pre-configured with:
  - Base URL `/api` (proxied by Vite dev server)
  - Request interceptor: Attaches JWT token to all requests
  - Response interceptor: Logs API calls with duration, handles 401 by redirecting to login

#### Routing
- **ProtectedRoute**: Route guard component that checks authentication and role
- Role-based route separation: `/applicant/*`, `/policy-manager/*`, `/main-manager/*`
- Root path `/` redirects based on user role

#### Shared Components
- **Layout**: App shell with sidebar navigation + top navbar
- **Sidebar**: Role-specific menu items (different options per role)
- **StatusBadge**: Color-coded status display (DRAFT=gray, SUBMITTED=blue, APPROVED=green, REJECTED=red, ESCALATED=yellow)
- **SearchBar**: Debounced search input (300ms debounce)
- **Pagination**: Page navigation with prev/next and info display
- **ConfirmDialog**: Three variants (danger/warning/info) for confirmation prompts
- **EmptyState**: Illustration + message for empty data scenarios
- **LoadingSkeleton**: Animated placeholder for loading states (card + table variants)
- **ErrorBoundary**: React error boundary with reset functionality

#### Pages
- **Login**: Username/password form with loading state and demo credentials display
- **Applicant Dashboard**: Stats cards (drafts, submitted, total) + recent activity timeline
- **New Application**: PDF upload or manual form entry with AI data extraction flow
- **My Applications**: Paginated table of own applications with status, actions
- **Policy Dashboard**: Pending reviews count, reviewed today, escalation stats
- **Review Applications**: Queue of applications to review with approve/reject/escalate actions
- **Policy Search**: Full-text search across all non-draft applications
- **Main Dashboard**: Escalated cases count, approval/rejection stats
- **Escalated Cases**: Review escalated applications with approve/reject actions
- **Main Search**: Full-text search across all applications

---

## 🤖 LLM / AI Integration

### Provider Support

| Provider           | Format      | Default Model        | Best For                       |
|-------------------|-------------|---------------------|--------------------------------|
| OpenAI            | Chat API    | gpt-4o              | Cloud, high accuracy           |
| Anthropic         | Messages API| claude-3-5-sonnet   | Cloud, long context            |
| Google Gemini     | Generate API| gemini-2.0-flash    | Cloud, fast, free tier         |
| OpenAI-Compatible | Chat API    | (configurable)      | Local/LM Studio/LocalAI/vLLM   |
| Ollama            | Chat API    | llama3              | Fully local, private           |

### Two-Phase AI Pipeline

1. **Data Extraction Phase**
   - Sends extracted PDF text to LLM
   - Prompt instructs LLM to return structured JSON with applicant details
   - Includes confidence scores for each extracted field
   - Fields below 0.7 confidence flagged as `needsVerification`

2. **Risk Analysis Phase**
   - Sends same PDF text to LLM with risk analysis prompt
   - Returns: riskScore, fraudProbability, missingDocuments, documentQuality, confidenceScore, policyRecommendation, approvalProbability, aiSummary, income/employment verification, creditAssessment

### Retry & Fallback Logic
- 2 retry attempts with 2s delay on LLM failure
- Timeout auto-detection (local = 1 hour, remote = 1 minute)
- Hardcoded fallback data when LLM is unreachable (for development)

---

## 👥 Role-Based Access Control

### Roles

| Role             | Description                                  |
|-----------------|----------------------------------------------|
| **APPLICANT**   | End user who applies for loans               |
| **POLICY_MANAGER** | First-level reviewer, can approve/reject/escalate |
| **MAIN_MANAGER**   | Second-level reviewer, handles escalated cases |

### Database Seeder

The `seed.ts` script creates demo users with bcrypt-hashed passwords:
```bash
cd loan-approval-backend-node
npm run seed
```

---

## 🧪 Testing

### Test Frameworks

| Module    | Framework | Test Type | Count |
|-----------|-----------|-----------|-------|
| Backend   | Jest 30 + Supertest | API Integration | 49 tests |
| Frontend  | Vitest 4 + happy-dom | Component + Unit | 50 tests |

### Running Tests

```bash
# Backend tests
cd loan-approval-backend-node
npm test        # jest --forceExit --detectOpenHandles

# Frontend tests
cd loan-approval-frontend
npx vitest run
```

### Test Coverage Areas

**Backend (49 tests):**
- Health check, Authentication (7), CRUD (9), Workflow (15), Access Control (3), Route Ordering (2), Dashboard (4)
- Full request/response cycle with mocked Prisma

**Frontend (50 tests):**
- StatusBadge (9), EmptyState (3), Pagination (7), CardSkeleton (1), TableSkeleton (4), SearchBar (5), ConfirmDialog (9), ProtectedRoute (3), AuthContext (5), Login Page (4)
- All states: loading, empty, error, edge cases

### Test Results

| Suite | Tests | Passing | Coverage |
|-------|-------|---------|----------|
| Backend | 49 | **100%** | All endpoints, error states, edge cases |
| Frontend | 50 | **100%** | All components, pages, auth, error states |
| **Total** | **99** | **100%** | **Full coverage** |

See [testing.md](./testing.md) for detailed test results.

---

## 🚢 Deployment

### Development
```bash
# Start both services
cd loan-approval-backend-node && npm run dev  # :8080
cd loan-approval-frontend && npm run dev      # :3001
```

### Production Build
```bash
# Build frontend
cd loan-approval-frontend
npm run build    # Outputs to dist/

# Build backend
cd loan-approval-backend-node
npm run build    # Outputs to dist/
npm run start    # Runs compiled JS
```

### Environment Variables for Production
- Set `NODE_ENV=production` to disable debug endpoints
- Configure proper `JWT_SECRET` (generate a strong random one)
- Set production `DATABASE_URL`
- Configure CORS origins for your domain
- Use a process manager (PM2) or containerization (Docker)

---

## 📄 License

Private - Internal Use Only
