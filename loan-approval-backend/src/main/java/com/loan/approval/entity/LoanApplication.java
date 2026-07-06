package com.loan.approval.entity;

import com.loan.approval.dto.enums.LoanStatus;
import com.loan.approval.dto.enums.RiskLevel;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "loan_applications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoanApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "file_path", nullable = false)
    private String filePath;

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "file_size")
    private Long fileSize;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LoanStatus status;

    @Column
    private String name;

    @Column
    private Integer age;

    @Column
    private Double salary;

    @Column
    private String occupation;

    @Column(name = "loan_amount")
    private Double loanAmount;

    @Column
    private String pan;

    @Column
    private String email;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column
    private String employer;

    @Column(name = "ai_raw_response", columnDefinition = "TEXT")
    private String aiRawResponse;

    @Column(name = "risk_score")
    private Integer riskScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_level")
    private RiskLevel riskLevel;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "policy_manager_id")
    private User policyManager;

    @Column(name = "policy_decision_notes")
    private String policyDecisionNotes;

    @Column(name = "policy_decided_at")
    private LocalDateTime policyDecidedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "main_manager_id")
    private User mainManager;

    @Column(name = "main_decision_notes")
    private String mainDecisionNotes;

    @Column(name = "main_decided_at")
    private LocalDateTime mainDecidedAt;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "application", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ValidationError> validationErrors = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) status = LoanStatus.SUBMITTED;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
