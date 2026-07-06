package com.loan.approval.dto.response;

import com.loan.approval.dto.enums.RiskLevel;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ValidationResult {

    private List<String> errors;
    private int riskScore;
    private RiskLevel riskLevel;
    private boolean valid;
}
