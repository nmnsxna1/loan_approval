package com.loan.approval.service;

import com.loan.approval.dto.LoginRequest;
import com.loan.approval.dto.LoginResponse;
import com.loan.approval.dto.RegisterRequest;
import com.loan.approval.entity.User;
import com.loan.approval.repository.UserRepository;
import com.loan.approval.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;

    public LoginResponse login(LoginRequest request) {
        log.debug("Authenticating user: {}", request.getUsername());
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));

        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> {
                    log.warn("User not found after authentication: {}", request.getUsername());
                    return new RuntimeException("User not found");
                });

        String token = jwtTokenProvider.generateToken(user.getUsername());

        log.info("Login successful for user: {} (role: {})", user.getUsername(), user.getRole());
        return LoginResponse.builder()
                .token(token)
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .build();
    }

    public String register(RegisterRequest request) {
        log.info("Registering new user: {} with role: {}", request.getUsername(), request.getRole());

        if (userRepository.existsByUsername(request.getUsername())) {
            log.warn("Registration failed - username already exists: {}", request.getUsername());
            throw new RuntimeException("Username already exists");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            log.warn("Registration failed - email already exists: {}", request.getEmail());
            throw new RuntimeException("Email already exists");
        }

        User user = User.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .email(request.getEmail())
                .role(request.getRole())
                .enabled(true)
                .build();

        userRepository.save(user);
        log.info("User registered successfully: {}", request.getUsername());
        return "User registered successfully";
    }
}
