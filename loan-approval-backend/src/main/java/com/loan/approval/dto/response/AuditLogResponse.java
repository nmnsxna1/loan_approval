package com.loan.approval.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLogResponse {

    private Long id;
    private Long applicationId;
    private String action;
    private String performedBy;
    private String performedByRole;
    private String details;
    private LocalDateTime createdAt;
}
