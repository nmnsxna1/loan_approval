package com.loan.approval.dto.response;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimelineResponse {

    private Long applicationId;
    private String status;
    private List<AuditLogResponse> timeline;
}
