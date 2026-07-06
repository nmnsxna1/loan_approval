package com.loan.approval.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExtractedData {

    private String name;
    private Integer age;
    private Double salary;
    private String occupation;
    private Double loanAmount;
    private String pan;
    private String email;
    private String address;
    private String employer;
    private String error;
}
