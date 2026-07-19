package com.automationportal.audit;

import com.automationportal.users.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findTop50ByUserOrderByCreatedAtDesc(User user);
}
