package com.automationportal.apitesting.group;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ApiGroupExecutionRepository extends JpaRepository<ApiGroupExecution, Long> {

    Page<ApiGroupExecution> findByGroupIdOrderByStartedAtDesc(Long groupId, Pageable pageable);

    Page<ApiGroupExecution> findAllByOrderByStartedAtDesc(Pageable pageable);

    ApiGroupExecution findFirstByGroupIdOrderByStartedAtDesc(Long groupId);

    List<ApiGroupExecution> findByStatus(ApiGroupExecution.Status status);
}
