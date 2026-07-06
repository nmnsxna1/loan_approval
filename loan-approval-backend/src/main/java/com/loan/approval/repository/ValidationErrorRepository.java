package com.loan.approval.repository;

import com.loan.approval.entity.ValidationError;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ValidationErrorRepository extends JpaRepository<ValidationError, Long> {

    List<ValidationError> findByApplicationId(Long applicationId);

    void deleteByApplicationId(Long applicationId);
}
