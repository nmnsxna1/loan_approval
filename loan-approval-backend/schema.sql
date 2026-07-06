-- =====================================================
-- Loan Approval System - Database Schema
-- PostgreSQL
-- =====================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('APPLICANT', 'POLICY_MANAGER', 'MAIN_MANAGER')),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loan applications table
CREATE TABLE IF NOT EXISTS loan_applications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255),
    file_size BIGINT,
    status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED'
        CHECK (status IN ('DRAFT','SUBMITTED','POLICY_REVIEW','POLICY_APPROVED','POLICY_REJECTED','MAIN_REVIEW','APPROVED','REJECTED')),

    -- Extracted fields from AI
    name VARCHAR(255),
    age INTEGER,
    salary DOUBLE PRECISION,
    occupation VARCHAR(255),
    loan_amount DOUBLE PRECISION,
    pan VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    employer VARCHAR(255),

    -- AI raw response
    ai_raw_response TEXT,

    -- Validation / Risk
    risk_score INTEGER,
    risk_level VARCHAR(20) CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),

    -- Policy Manager decision
    policy_manager_id BIGINT REFERENCES users(id),
    policy_decision_notes TEXT,
    policy_decided_at TIMESTAMP,

    -- Main Manager decision
    main_manager_id BIGINT REFERENCES users(id),
    main_decision_notes TEXT,
    main_decided_at TIMESTAMP,

    -- Audit
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for loan_applications
CREATE INDEX idx_loan_applications_user_id ON loan_applications(user_id);
CREATE INDEX idx_loan_applications_status ON loan_applications(status);
CREATE INDEX idx_loan_applications_policy_manager ON loan_applications(policy_manager_id);
CREATE INDEX idx_loan_applications_created_at ON loan_applications(created_at DESC);

-- Validation errors table
CREATE TABLE IF NOT EXISTS validation_errors (
    id BIGSERIAL PRIMARY KEY,
    application_id BIGINT NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
    field VARCHAR(255) NOT NULL,
    message VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_validation_errors_application_id ON validation_errors(application_id);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    application_id BIGINT NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
    action VARCHAR(255) NOT NULL,
    performed_by VARCHAR(255) NOT NULL,
    performed_by_role VARCHAR(50) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_application_id ON audit_logs(application_id);
CREATE INDEX idx_audit_logs_performed_by ON audit_logs(performed_by);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- =====================================================
-- Sample Data
-- BCrypt hash for '123456': $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
-- Generate fresh hash using: https://bcrypt-generator.com or Spring Boot DataSeeder
-- =====================================================

-- Users (passwords will be encoded by DataSeeder at runtime)
-- INSERT INTO users (username, password, email, role, enabled) VALUES
-- ('applicant',      '$2a$10$PLACEHOLDER_HASH_HERE', 'applicant@loan.com',      'APPLICANT',       true),
-- ('policy_manager', '$2a$10$PLACEHOLDER_HASH_HERE', 'policy.manager@loan.com', 'POLICY_MANAGER',  true),
-- ('main_manager',   '$2a$10$PLACEHOLDER_HASH_HERE', 'main.manager@loan.com',   'MAIN_MANAGER',    true);
--
-- Note: The DataSeeder CommandLineRunner in the Spring Boot app handles
-- initial user creation automatically. These INSERTs are for reference.
