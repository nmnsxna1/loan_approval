package com.loan.approval.runner;

import com.loan.approval.entity.Role;
import com.loan.approval.entity.User;
import com.loan.approval.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            log.info("Users already exist, skipping data seeding");
            return;
        }

        User applicant = User.builder()
                .username("applicant")
                .password(passwordEncoder.encode("123456"))
                .email("applicant@loan.com")
                .role(Role.APPLICANT)
                .enabled(true)
                .build();

        User policyManager = User.builder()
                .username("policy_manager")
                .password(passwordEncoder.encode("123456"))
                .email("policy.manager@loan.com")
                .role(Role.POLICY_MANAGER)
                .enabled(true)
                .build();

        User mainManager = User.builder()
                .username("main_manager")
                .password(passwordEncoder.encode("123456"))
                .email("main.manager@loan.com")
                .role(Role.MAIN_MANAGER)
                .enabled(true)
                .build();

        userRepository.save(applicant);
        userRepository.save(policyManager);
        userRepository.save(mainManager);

        log.info("Seed users created successfully");
    }
}
