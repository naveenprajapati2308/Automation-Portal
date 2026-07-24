package com.automationportal.apitesting.baseapi;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ApiVariableBindingRepository extends JpaRepository<ApiVariableBinding, Long> {

    /** Extraction definitions declared on a base API. */
    List<ApiVariableBinding> findByBaseApiIdAndRegularApiIdIsNull(Long baseApiId);

    /** Bindings a regular API consumes. */
    List<ApiVariableBinding> findByRegularApiId(Long regularApiId);

    /** Bindings sourcing their value from a given Regular API (used to block deleting an API others depend on). */
    List<ApiVariableBinding> findBySourceRegularApiId(Long sourceRegularApiId);
}
