package com.automationportal.apitesting.baseapi;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ApiVariableBindingRepository extends JpaRepository<ApiVariableBinding, Long> {

    /** Extraction definitions declared on a base API. */
    List<ApiVariableBinding> findByBaseApiIdAndRegularApiIdIsNull(Long baseApiId);

    /** Bindings a regular API consumes. */
    List<ApiVariableBinding> findByRegularApiId(Long regularApiId);
}
