package com.loan.approval.repository;

import com.loan.approval.dto.enums.LoanStatus;
import com.loan.approval.entity.LoanApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface LoanApplicationRepository extends JpaRepository<LoanApplication, Long> {

    List<LoanApplication> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<LoanApplication> findByStatusOrderByCreatedAtDesc(LoanStatus status);

    @Query("SELECT la FROM LoanApplication la WHERE la.status IN :statuses ORDER BY la.createdAt DESC")
    List<LoanApplication> findByStatusIn(List<LoanStatus> statuses);

    long countByStatus(LoanStatus status);
}
