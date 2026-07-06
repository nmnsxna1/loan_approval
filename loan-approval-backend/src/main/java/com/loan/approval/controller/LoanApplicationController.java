package com.loan.approval.controller;

import com.loan.approval.dto.enums.LoanStatus;
import com.loan.approval.dto.response.ApplicationResponse;
import com.loan.approval.entity.Role;
import com.loan.approval.dto.response.AuditLogResponse;
import com.loan.approval.dto.response.TimelineResponse;
import com.loan.approval.entity.AuditLog;
import com.loan.approval.entity.LoanApplication;
import com.loan.approval.entity.User;
import com.loan.approval.repository.AuditLogRepository;
import com.loan.approval.repository.LoanApplicationRepository;
import com.loan.approval.security.CustomUserDetailsService;
import com.loan.approval.service.WorkflowService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/applications")
@RequiredArgsConstructor
@Slf4j
public class LoanApplicationController {

    private final LoanApplicationRepository applicationRepository;
    private final AuditLogRepository auditLogRepository;
    private final WorkflowService workflowService;
    private final CustomUserDetailsService userDetailsService;

    @GetMapping("/my")
    public ResponseEntity<List<ApplicationResponse>> getMyApplications(Authentication auth) {
        String username = auth.getName();
        log.info("Fetching applications for user: {}", username);
        User user = (User) userDetailsService.loadUserByUsername(username);
        List<LoanApplication> apps = applicationRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        log.info("Found {} applications for user: {}", apps.size(), username);
        return ResponseEntity.ok(apps.stream().map(this::toResponse).toList());
    }

    @GetMapping("/pending-policy")
    @PreAuthorize("hasRole('POLICY_MANAGER')")
    public ResponseEntity<List<ApplicationResponse>> getPendingPolicyReview() {
        log.info("Fetching pending policy review applications");
        List<LoanApplication> apps = applicationRepository
                .findByStatusOrderByCreatedAtDesc(LoanStatus.POLICY_REVIEW);
        log.info("Found {} pending policy review applications", apps.size());
        return ResponseEntity.ok(apps.stream().map(this::toResponse).toList());
    }

    @GetMapping("/pending-main")
    @PreAuthorize("hasRole('MAIN_MANAGER')")
    public ResponseEntity<List<ApplicationResponse>> getPendingMainReview() {
        log.info("Fetching pending main manager review applications");
        List<LoanApplication> apps = applicationRepository
                .findByStatusOrderByCreatedAtDesc(LoanStatus.POLICY_APPROVED);
        log.info("Found {} pending main review applications", apps.size());
        return ResponseEntity.ok(apps.stream().map(this::toResponse).toList());
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('MAIN_MANAGER')")
    public ResponseEntity<List<ApplicationResponse>> getAllApplications() {
        log.info("Fetching all applications (main manager)");
        List<LoanApplication> apps = applicationRepository.findAll();
        log.info("Found {} total applications", apps.size());
        return ResponseEntity.ok(apps.stream().map(this::toResponse).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApplicationResponse> getApplication(@PathVariable Long id, Authentication auth) {
        log.info("Fetching application by id: {}", id);
        LoanApplication app = applicationRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Application not found: {}", id);
                    return new RuntimeException("Application not found");
                });
        User user = (User) userDetailsService.loadUserByUsername(auth.getName());
        if (user.getRole() == Role.APPLICANT && !app.getUser().getId().equals(user.getId())) {
            log.warn("Access denied: user {} attempted to view application {} owned by {}",
                    user.getId(), id, app.getUser().getId());
            throw new org.springframework.security.access.AccessDeniedException("Access denied");
        }
        return ResponseEntity.ok(toResponse(app));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<String> approve(@PathVariable Long id, Authentication auth) {
        String username = auth.getName();
        log.info("Approve request for application {} by user {}", id, username);
        User user = (User) userDetailsService.loadUserByUsername(username);

        switch (user.getRole()) {
            case POLICY_MANAGER -> workflowService.approveByPolicyManager(id, user);
            case MAIN_MANAGER -> workflowService.approveByMainManager(id, user);
            default -> throw new RuntimeException("Unauthorized action");
        }
        log.info("Application {} approved by {}", id, username);
        return ResponseEntity.ok("Application approved");
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<String> reject(@PathVariable Long id, Authentication auth) {
        String username = auth.getName();
        log.info("Reject request for application {} by user {}", id, username);
        User user = (User) userDetailsService.loadUserByUsername(username);

        switch (user.getRole()) {
            case POLICY_MANAGER -> workflowService.rejectByPolicyManager(id, user);
            case MAIN_MANAGER -> workflowService.rejectByMainManager(id, user);
            default -> throw new RuntimeException("Unauthorized action");
        }
        log.info("Application {} rejected by {}", id, username);
        return ResponseEntity.ok("Application rejected");
    }

    @GetMapping("/{id}/timeline")
    public ResponseEntity<TimelineResponse> getTimeline(@PathVariable Long id) {
        log.info("Fetching timeline for application: {}", id);
        LoanApplication app = applicationRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Application not found for timeline: {}", id);
                    return new RuntimeException("Application not found");
                });
        List<AuditLog> logs = auditLogRepository.findByApplicationIdOrderByCreatedAtAsc(id);

        List<AuditLogResponse> timeline = logs.stream()
                .map(log -> AuditLogResponse.builder()
                        .id(log.getId())
                        .applicationId(log.getApplication().getId())
                        .action(log.getAction())
                        .performedBy(log.getPerformedBy())
                        .performedByRole(log.getPerformedByRole())
                        .details(log.getDetails())
                        .createdAt(log.getCreatedAt())
                        .build())
                .toList();

        log.info("Timeline for application {} has {} entries", id, timeline.size());
        return ResponseEntity.ok(TimelineResponse.builder()
                .applicationId(id)
                .status(app.getStatus().name())
                .timeline(timeline)
                .build());
    }

    @GetMapping("/audit-log")
    @PreAuthorize("hasRole('MAIN_MANAGER')")
    public ResponseEntity<List<AuditLogResponse>> getAllAuditLogs() {
        log.info("Fetching all audit logs");
        List<AuditLog> logs = auditLogRepository.findAllByOrderByCreatedAtDesc();
        log.info("Found {} audit log entries", logs.size());
        return ResponseEntity.ok(logs.stream()
                .map(log -> AuditLogResponse.builder()
                        .id(log.getId())
                        .applicationId(log.getApplication().getId())
                        .action(log.getAction())
                        .performedBy(log.getPerformedBy())
                        .performedByRole(log.getPerformedByRole())
                        .details(log.getDetails())
                        .createdAt(log.getCreatedAt())
                        .build())
                .toList());
    }

    private ApplicationResponse toResponse(LoanApplication app) {
        return ApplicationResponse.builder()
                .id(app.getId())
                .userId(app.getUser().getId())
                .applicantName(app.getName())
                .fileName(app.getFileName())
                .fileSize(app.getFileSize())
                .status(app.getStatus())
                .name(app.getName())
                .age(app.getAge())
                .salary(app.getSalary())
                .occupation(app.getOccupation())
                .loanAmount(app.getLoanAmount())
                .pan(app.getPan())
                .email(app.getEmail())
                .address(app.getAddress())
                .employer(app.getEmployer())
                .riskScore(app.getRiskScore())
                .riskLevel(app.getRiskLevel())
                .createdBy(app.getCreatedBy())
                .createdAt(app.getCreatedAt())
                .updatedAt(app.getUpdatedAt())
                .validationErrors(app.getValidationErrors())
                .build();
    }
}
