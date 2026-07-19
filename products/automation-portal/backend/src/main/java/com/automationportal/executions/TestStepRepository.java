package com.automationportal.executions;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TestStepRepository extends JpaRepository<TestStep, Long> {
    List<TestStep> findByTestCaseIdOrderByStepOrder(Long testCaseId);
    void deleteByTestCaseId(Long testCaseId);
}
