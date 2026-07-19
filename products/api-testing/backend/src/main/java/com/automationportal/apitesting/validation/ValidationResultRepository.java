package com.automationportal.apitesting.validation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ValidationResultRepository extends JpaRepository<ValidationResult, Long> {

    @Query("""
            SELECT new com.automationportal.apitesting.validation.ValidationResultView(
                v.id, v.ruleId, r.jsonPath, CAST(r.operator AS string), r.expectedValue, v.passed, v.actualValue)
            FROM ValidationResult v JOIN ApiValidationRule r ON r.id = v.ruleId
            WHERE v.executionHistoryId = :executionId
            ORDER BY v.id
            """)
    List<ValidationResultView> findViewsByExecutionId(@Param("executionId") Long executionId);
}
