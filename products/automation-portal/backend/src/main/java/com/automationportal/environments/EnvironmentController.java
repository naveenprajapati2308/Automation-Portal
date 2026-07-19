package com.automationportal.environments;

import com.automationportal.common.ApiResponse;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/environments")
public class EnvironmentController {
    private final EnvironmentRepository repository;
    private final EnvironmentHealthService healthService;

    public EnvironmentController(EnvironmentRepository repository, EnvironmentHealthService healthService) {
        this.repository = repository;
        this.healthService = healthService;
    }

    @GetMapping
    public ApiResponse<List<EnvironmentEntity>> list() {
        return ApiResponse.ok(repository.findAll());
    }

    @GetMapping("/health")
    public ApiResponse<List<Map<String, Object>>> health() {
        return ApiResponse.ok(healthService.health());
    }

    @PostMapping
    public ApiResponse<EnvironmentEntity> create(@RequestBody EnvironmentEntity entity) {
        if (entity.getCode() == null || entity.getCode().trim().isEmpty()) {
            throw new IllegalArgumentException("Code is required");
        }
        if (entity.getName() == null || entity.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Name is required");
        }
        return ApiResponse.ok(repository.save(entity));
    }

    @PutMapping("/{id}")
    public ApiResponse<EnvironmentEntity> update(@PathVariable Long id, @RequestBody EnvironmentEntity entity) {
        EnvironmentEntity existing = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Environment not found: " + id));
        if (entity.getCode() != null && !entity.getCode().trim().isEmpty()) {
            existing.setCode(entity.getCode());
        }
        if (entity.getName() != null && !entity.getName().trim().isEmpty()) {
            existing.setName(entity.getName());
        }
        if (entity.getBaseUrl() != null) {
            existing.setBaseUrl(entity.getBaseUrl());
        }
        if (entity.getConfigJson() != null) {
            existing.setConfigJson(entity.getConfigJson());
        }
        existing.setActive(entity.isActive());
        return ApiResponse.ok(repository.save(existing));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<String> delete(@PathVariable Long id) {
        if (!repository.existsById(id)) {
            throw new IllegalArgumentException("Please Try again Environment not found: " + id);
        }
        repository.deleteById(id);
        return ApiResponse.ok("Environment deleted successfully");
    }
}
