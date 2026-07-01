package com.automationportal.audit;

import com.automationportal.users.User;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;

@Service
public class AuditService {
    private final AuditLogRepository repository;

    public AuditService(AuditLogRepository repository) {
        this.repository = repository;
    }

    public void record(User user, AuditAction action, String details, HttpServletRequest request) {
        AuditLog log = new AuditLog();
        log.setUser(user);
        log.setUsername(user != null ? user.getUsername() : null);
        log.setAction(action);
        log.setDetails(details);
        log.setIpAddress(request != null ? request.getRemoteAddr() : null);
        repository.save(log);
    }
}
