package com.loan.approval.controller;

import com.loan.approval.dto.LoginRequest;
import com.loan.approval.dto.LoginResponse;
import com.loan.approval.dto.RegisterRequest;
import com.loan.approval.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        log.info("Login attempt for user: {}", request.getUsername());
        try {
            LoginResponse response = authService.login(request);
            log.info("Login successful for user: {}", request.getUsername());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.warn("Login failed for user: {} - {}", request.getUsername(), e.getMessage());
            throw e;
        }
    }

    @PostMapping("/register")
    public ResponseEntity<String> register(@Valid @RequestBody RegisterRequest request) {
        log.info("Registration attempt for user: {}", request.getUsername());
        try {
            String result = authService.register(request);
            log.info("Registration successful for user: {}", request.getUsername());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.warn("Registration failed for user: {} - {}", request.getUsername(), e.getMessage());
            throw e;
        }
    }
}
