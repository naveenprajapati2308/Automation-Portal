package com.automationportal.apitesting.audit;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/audit")
@RequiredArgsConstructor
public class AuditController {

    private final AuditLogRepository repository;

    @GetMapping
    public Page<AuditLog> list(@RequestParam(required = false) AuditLog.EntityType entityType,
                               @RequestParam(defaultValue = "0") int page,
                               @RequestParam(defaultValue = "25") int size) {
        PageRequest pr = PageRequest.of(page, Math.min(size, 100));
        return entityType == null
                ? repository.findAllByOrderByCreatedAtDesc(pr)
                : repository.findByEntityTypeOrderByCreatedAtDesc(entityType, pr);
    }
}
