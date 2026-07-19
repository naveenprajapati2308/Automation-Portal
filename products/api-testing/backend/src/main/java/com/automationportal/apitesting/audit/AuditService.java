package com.automationportal.apitesting.audit;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Records audit entries. Failures are swallowed — an audit hiccup must never
 * break the business operation it describes.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository repository;

    public void record(AuditLog.EntityType entityType, Long entityId, AuditLog.Action action, String details) {
        try {
            AuditLog entry = new AuditLog();
            entry.setEntityType(entityType);
            entry.setEntityId(entityId);
            entry.setAction(action);
            entry.setDetails(details == null || details.length() <= 2000 ? details : details.substring(0, 2000));
            repository.save(entry);
        } catch (Exception e) {
            log.warn("audit write failed for {} {} {}: {}", entityType, entityId, action, e.getMessage());
        }
    }
}
