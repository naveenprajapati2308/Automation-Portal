package com.automationportal.apitesting.audit;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    Page<AuditLog> findByProjectIdOrderByCreatedAtDesc(Long projectId, Pageable pageable);

    Page<AuditLog> findByProjectIdAndEntityTypeOrderByCreatedAtDesc(Long projectId, AuditLog.EntityType entityType, Pageable pageable);
}
