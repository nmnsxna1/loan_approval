package com.loan.approval.repository;

import com.loan.approval.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    List<AuditLog> findByApplicationIdOrderByCreatedAtAsc(Long applicationId);

    List<AuditLog> findAllByOrderByCreatedAtDesc();
}
