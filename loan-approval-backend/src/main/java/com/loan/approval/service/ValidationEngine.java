package com.loan.approval.service;

import com.loan.approval.dto.enums.RiskLevel;
import com.loan.approval.dto.response.ExtractedData;
import com.loan.approval.dto.response.ValidationResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@Service
@Slf4j
public class ValidationEngine {

    private static final Pattern PAN_PATTERN = Pattern.compile("[A-Z]{5}[0-9]{4}[A-Z]");
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");
    private static final int MIN_AGE = 18;
    private static final int MAX_AGE = 60;
    private static final double MIN_SALARY = 25000;
    private static final int LOAN_TO_SALARY_MULTIPLIER = 60;
    private static final List<String> VALID_OCCUPATIONS = List.of(
            "engineer", "doctor", "teacher", "software engineer", "accountant",
            "manager", "analyst", "consultant", "business owner", "government employee",
            "banker", "lawyer", "architect", "nurse", "scientist"
    );

    public ValidationResult validate(ExtractedData data) {
        List<String> errors = new ArrayList<>();

        validateField(data.getName(), "name", "Name is required", errors);
        validateField(data.getAge(), "age", "Age is required", errors);
        validateField(data.getSalary(), "salary", "Salary is required", errors);
        validateField(data.getOccupation(), "occupation", "Occupation is required", errors);
        validateField(data.getLoanAmount(), "loanAmount", "Loan amount is required", errors);
        validateField(data.getPan(), "pan", "PAN is required", errors);
        validateField(data.getEmail(), "email", "Email is required", errors);
        validateField(data.getAddress(), "address", "Address is required", errors);
        validateField(data.getEmployer(), "employer", "Employer is required", errors);

        if (data.getAge() != null && (data.getAge() < MIN_AGE || data.getAge() > MAX_AGE)) {
            errors.add("Age must be between " + MIN_AGE + " and " + MAX_AGE);
        }

        if (data.getSalary() != null && data.getSalary() <= MIN_SALARY) {
            errors.add("Salary must be greater than " + MIN_SALARY);
        }

        if (data.getPan() != null && !PAN_PATTERN.matcher(data.getPan().toUpperCase()).matches()) {
            errors.add("PAN must be in format AAAAA9999A (5 letters, 4 digits, 1 letter)");
        }

        if (data.getLoanAmount() != null && data.getSalary() != null) {
            double maxLoan = data.getSalary() * LOAN_TO_SALARY_MULTIPLIER;
            if (data.getLoanAmount() > maxLoan) {
                errors.add("Loan amount (₹" + String.format("%.0f", data.getLoanAmount()) +
                        ") exceeds maximum of " + LOAN_TO_SALARY_MULTIPLIER +
                        "x salary (₹" + String.format("%.0f", maxLoan) + ")");
            }
        }

        if (data.getEmail() != null && !EMAIL_PATTERN.matcher(data.getEmail()).matches()) {
            errors.add("Email format is invalid");
        }

        if (data.getOccupation() != null) {
            boolean occupationValid = VALID_OCCUPATIONS.stream()
                    .anyMatch(occ -> data.getOccupation().toLowerCase().contains(occ));
            if (!occupationValid) {
                errors.add("Occupation '" + data.getOccupation() + "' is not recognized as a valid occupation");
            }
        }

        int riskScore = calculateRiskScore(data, errors);
        RiskLevel riskLevel = calculateRiskLevel(riskScore, errors);

        return ValidationResult.builder()
                .errors(errors)
                .riskScore(riskScore)
                .riskLevel(riskLevel)
                .valid(errors.isEmpty())
                .build();
    }

    private void validateField(Object value, String fieldName, String message, List<String> errors) {
        if (value == null || (value instanceof String && ((String) value).isBlank())) {
            errors.add(fieldName + ": " + message);
        }
    }

    private int calculateRiskScore(ExtractedData data, List<String> errors) {
        int score = 0;

        if (errors.isEmpty()) score += 20;

        if (data.getAge() != null) {
            if (data.getAge() >= 25 && data.getAge() <= 45) score += 15;
            else if (data.getAge() > 45 && data.getAge() <= 55) score += 10;
            else score += 5;
        }

        if (data.getSalary() != null) {
            if (data.getSalary() >= 100000) score += 25;
            else if (data.getSalary() >= 50000) score += 20;
            else score += 10;
        }

        if (data.getLoanAmount() != null && data.getSalary() != null) {
            double ratio = data.getLoanAmount() / (data.getSalary() * 12);
            if (ratio <= 2) score += 20;
            else if (ratio <= 4) score += 15;
            else score += 5;
        }

        if (data.getOccupation() != null) {
            String occ = data.getOccupation().toLowerCase();
            if (occ.contains("engineer") || occ.contains("doctor") || occ.contains("scientist")) score += 10;
            else if (occ.contains("manager") || occ.contains("analyst") || occ.contains("consultant")) score += 8;
            else score += 5;
        }

        if (data.getEmployer() != null) score += 5;
        if (data.getAddress() != null) score += 5;

        return Math.min(score, 100);
    }

    private RiskLevel calculateRiskLevel(int score, List<String> errors) {
        if (!errors.isEmpty()) return RiskLevel.HIGH;
        if (score >= 70) return RiskLevel.LOW;
        if (score >= 45) return RiskLevel.MEDIUM;
        return RiskLevel.HIGH;
    }
}
