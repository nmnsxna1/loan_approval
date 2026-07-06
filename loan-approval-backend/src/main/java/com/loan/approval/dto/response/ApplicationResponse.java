package com.loan.approval.dto.response;

import com.loan.approval.dto.enums.LoanStatus;
import com.loan.approval.dto.enums.RiskLevel;
import com.loan.approval.entity.ValidationError;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApplicationResponse {

    private Long id;
    private Long userId;
    private String applicantName;
    private String fileName;
    private Long fileSize;
    private LoanStatus status;
    private String name;
    private Integer age;
    private Double salary;
    private String occupation;
    private Double loanAmount;
    private String pan;
    private String email;
    private String address;
    private String employer;
    private Integer riskScore;
    private RiskLevel riskLevel;
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<ValidationError> validationErrors;
}
