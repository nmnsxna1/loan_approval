package com.loan.approval;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@Slf4j
public class LoanApprovalApplication {

    public static void main(String[] args) {
        log.info("Loan Approval Application starting...");
        SpringApplication.run(LoanApprovalApplication.class, args);
        log.info("Loan Approval Application started successfully");
    }
}
