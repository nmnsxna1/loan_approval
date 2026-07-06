package com.loan.approval.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.loan.approval.dto.enums.LoanStatus;
import com.loan.approval.email.EmailService;
import com.loan.approval.entity.AuditLog;
import com.loan.approval.entity.LoanApplication;
import com.loan.approval.entity.User;
import com.loan.approval.repository.AuditLogRepository;
import com.loan.approval.repository.LoanApplicationRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class WorkflowService {

    private final LoanApplicationRepository applicationRepository;
    private final AuditLogRepository auditLogRepository;
    private final EmailService emailService;

    @Transactional
    public LoanApplication submitApplication(LoanApplication application) {
        application.setStatus(LoanStatus.SUBMITTED);
        LoanApplication saved = applicationRepository.save(application);

        addAuditLog(saved, "APPLICATION_SUBMITTED", application.getCreatedBy(),
                "APPLICANT", "Application submitted for processing");

        return saved;
    }

    @Transactional
    public LoanApplication processValidation(Long applicationId, boolean valid, List<String> validationErrors) {
        LoanApplication app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found: " + applicationId));

        if (valid) {
            app.setStatus(LoanStatus.POLICY_REVIEW);
        } else {
            app.setStatus(LoanStatus.REJECTED);
        }

        LoanApplication saved = applicationRepository.save(app);

        addAuditLog(saved, "VALIDATION_COMPLETED", "SYSTEM",
                "SYSTEM", valid ? "Validation passed" : "Validation failed: " + String.join("; ", validationErrors));

        return saved;
    }

    @Transactional
    public LoanApplication approveByPolicyManager(Long applicationId, User policyManager) {
        LoanApplication app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found: " + applicationId));

        if (app.getStatus() != LoanStatus.POLICY_REVIEW) {
            throw new RuntimeException("Application is not in POLICY_REVIEW status");
        }

        app.setStatus(LoanStatus.POLICY_APPROVED);
        app.setPolicyManager(policyManager);
        app.setPolicyDecidedAt(LocalDateTime.now());
        LoanApplication saved = applicationRepository.save(app);

        addAuditLog(saved, "POLICY_APPROVED", policyManager.getUsername(),
                policyManager.getRole().name(), "Approved by Policy Manager");

        return saved;
    }

    @Transactional
    public LoanApplication rejectByPolicyManager(Long applicationId, User policyManager) {
        LoanApplication app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found: " + applicationId));

        if (app.getStatus() != LoanStatus.POLICY_REVIEW) {
            throw new RuntimeException("Application is not in POLICY_REVIEW status");
        }

        app.setStatus(LoanStatus.POLICY_REJECTED);
        app.setPolicyManager(policyManager);
        app.setPolicyDecidedAt(LocalDateTime.now());
        LoanApplication saved = applicationRepository.save(app);

        addAuditLog(saved, "POLICY_REJECTED", policyManager.getUsername(),
                policyManager.getRole().name(), "Rejected by Policy Manager");

        sendStatusEmail(app, "Rejected by Policy Manager");

        return saved;
    }

    @Transactional
    public LoanApplication approveByMainManager(Long applicationId, User mainManager) {
        LoanApplication app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found: " + applicationId));

        if (app.getStatus() != LoanStatus.POLICY_APPROVED) {
            throw new RuntimeException("Application is not in POLICY_APPROVED status");
        }

        app.setStatus(LoanStatus.APPROVED);
        app.setMainManager(mainManager);
        app.setMainDecidedAt(LocalDateTime.now());
        LoanApplication saved = applicationRepository.save(app);

        addAuditLog(saved, "MAIN_APPROVED", mainManager.getUsername(),
                mainManager.getRole().name(), "Approved by Main Manager");

        sendStatusEmail(app, "Your loan application has been APPROVED!");

        return saved;
    }

    @Transactional
    public LoanApplication rejectByMainManager(Long applicationId, User mainManager) {
        LoanApplication app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found: " + applicationId));

        if (app.getStatus() != LoanStatus.POLICY_APPROVED) {
            throw new RuntimeException("Application is not in POLICY_APPROVED status");
        }

        app.setStatus(LoanStatus.REJECTED);
        app.setMainManager(mainManager);
        app.setMainDecidedAt(LocalDateTime.now());
        LoanApplication saved = applicationRepository.save(app);

        addAuditLog(saved, "MAIN_REJECTED", mainManager.getUsername(),
                mainManager.getRole().name(), "Rejected by Main Manager");

        sendStatusEmail(app, "Your loan application has been REJECTED by Main Manager.");

        return saved;
    }

    private void addAuditLog(LoanApplication application, String action, String performedBy,
                             String performedByRole, String details) {
        AuditLog log = AuditLog.builder()
                .application(application)
                .action(action)
                .performedBy(performedBy)
                .performedByRole(performedByRole)
                .details(details)
                .build();
        auditLogRepository.save(log);
    }

    private void sendStatusEmail(LoanApplication app, String message) {
        try {
            if (app.getEmail() != null) {
                emailService.sendEmail(app.getEmail(), "Loan Application Status Update",
                        "Dear " + (app.getName() != null ? app.getName() : "Applicant") + ",\n\n" +
                                message + "\n\nApplication ID: " + app.getId() + "\n\nThank you.");
            }
        } catch (Exception e) {
            log.warn("Failed to send email for application {}: {}", app.getId(), e.getMessage());
        }
    }
}
