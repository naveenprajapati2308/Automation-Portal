package com.automationportal.audit;

import java.time.Instant;

public record AuditLogDto(Long id, AuditAction action, String details, String ipAddress, Instant createdAt) {
    public static AuditLogDto from(AuditLog log) {
        return new AuditLogDto(log.getId(), log.getAction(), log.getDetails(), log.getIpAddress(), log.getCreatedAt());
    }
}
