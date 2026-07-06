package com.loan.approval.controller;

import com.loan.approval.config.FileStorageProperties;
import com.loan.approval.dto.response.ExtractedData;
import com.loan.approval.dto.response.UploadResponse;
import com.loan.approval.dto.response.ValidationResult;
import com.loan.approval.entity.LoanApplication;
import com.loan.approval.entity.User;
import com.loan.approval.entity.ValidationError;
import com.loan.approval.repository.LoanApplicationRepository;
import com.loan.approval.repository.ValidationErrorRepository;
import com.loan.approval.security.CustomUserDetailsService;
import com.loan.approval.service.AIService;
import com.loan.approval.service.FileStorageService;
import com.loan.approval.service.ValidationEngine;
import com.loan.approval.service.WorkflowService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/upload")
@RequiredArgsConstructor
@Slf4j
public class UploadController {

    private final FileStorageService fileStorageService;
    private final AIService aiService;
    private final ValidationEngine validationEngine;
    private final WorkflowService workflowService;
    private final LoanApplicationRepository applicationRepository;
    private final ValidationErrorRepository validationErrorRepository;
    private final CustomUserDetailsService userDetailsService;
    private final FileStorageProperties fileStorageProperties;

    @PostMapping
    public ResponseEntity<UploadResponse> uploadFile(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {

        String username = authentication.getName();
        log.info("Upload request received from user: {}, fileName: {}, size: {}",
                username, file.getOriginalFilename(), file.getSize());

        if (file.isEmpty()) {
            log.warn("Upload failed: file is empty from user: {}", username);
            return ResponseEntity.badRequest().body(
                    UploadResponse.builder().message("File is empty").build());
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.equals("application/pdf")) {
            log.warn("Upload failed: invalid file type {} from user: {}", contentType, username);
            return ResponseEntity.badRequest().body(
                    UploadResponse.builder().message("Only PDF files are allowed").build());
        }

        if (file.getSize() > fileStorageProperties.getMaxFileSize()) {
            log.warn("Upload failed: file size {} exceeds limit from user: {}", file.getSize(), username);
            return ResponseEntity.badRequest().body(
                    UploadResponse.builder().message("File exceeds maximum size of 20MB").build());
        }

        User user = (User) userDetailsService.loadUserByUsername(username);

        String filePath = fileStorageService.storeFile(file);
        log.info("File stored at: {} for user: {}", filePath, username);

        LoanApplication application = LoanApplication.builder()
                .user(user)
                .filePath(filePath)
                .fileName(file.getOriginalFilename())
                .fileSize(file.getSize())
                .createdBy(username)
                .build();

        application = workflowService.submitApplication(application);
        log.info("Application {} created for user: {}", application.getId(), username);

        try {
            log.info("Starting AI extraction for application: {}", application.getId());
            ExtractedData extractedData = aiService.extractDataFromPdf(filePath);

            if (extractedData.getError() != null) {
                log.warn("AI extraction had errors for application {}: {}", application.getId(), extractedData.getError());
            }

            application.setName(extractedData.getName());
            application.setAge(extractedData.getAge());
            application.setSalary(extractedData.getSalary());
            application.setOccupation(extractedData.getOccupation());
            application.setLoanAmount(extractedData.getLoanAmount());
            application.setPan(extractedData.getPan());
            application.setEmail(extractedData.getEmail());
            application.setAddress(extractedData.getAddress());
            application.setEmployer(extractedData.getEmployer());

            ValidationResult validationResult = validationEngine.validate(extractedData);
            log.info("Validation result for application {}: valid={}, riskScore={}",
                    application.getId(), validationResult.isValid(), validationResult.getRiskScore());

            application.setRiskScore(validationResult.getRiskScore());
            application.setRiskLevel(validationResult.getRiskLevel());

            applicationRepository.save(application);

            for (String error : validationResult.getErrors()) {
                String[] parts = error.split(":", 2);
                String field = parts.length > 1 ? parts[0].trim() : "general";
                String message = parts.length > 1 ? parts[1].trim() : error;

                ValidationError ve = ValidationError.builder()
                        .application(application)
                        .field(field)
                        .message(message)
                        .build();
                validationErrorRepository.save(ve);
            }

            if (!validationResult.getErrors().isEmpty()) {
                log.warn("Validation errors for application {}: {}", application.getId(), validationResult.getErrors());
            }

            workflowService.processValidation(application.getId(),
                    validationResult.isValid(), validationResult.getErrors());

            log.info("Application {} processed successfully", application.getId());

        } catch (Exception e) {
            log.error("Error processing application {}: {}", application.getId(), e.getMessage(), e);
            application.setStatus(com.loan.approval.dto.enums.LoanStatus.POLICY_REVIEW);
            applicationRepository.save(application);
        }

        return ResponseEntity.ok(UploadResponse.builder()
                .applicationId(application.getId())
                .message("Application submitted successfully")
                .build());
    }
}
