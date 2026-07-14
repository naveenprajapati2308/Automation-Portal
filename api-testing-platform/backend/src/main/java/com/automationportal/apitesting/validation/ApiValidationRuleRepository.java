package com.automationportal.apitesting.validation;

import com.automationportal.apitesting.history.ExecutionHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ApiValidationRuleRepository extends JpaRepository<ApiValidationRule, Long> {

    List<ApiValidationRule> findByApiTypeAndApiId(ExecutionHistory.ApiType apiType, Long apiId);

    List<ApiValidationRule> findByApiTypeAndApiIdAndIsActiveTrue(ExecutionHistory.ApiType apiType, Long apiId);
}
