package com.automationportal.config;

import com.automationportal.common.ApiResponse;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/configurations")
public class PortalConfigController {

    private final PortalConfigRepository repository;

    public PortalConfigController(PortalConfigRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public ApiResponse<List<PortalConfigEntity>> list() {
        return ApiResponse.ok(repository.findAll());
    }

    @PutMapping("/{key}")
    public ApiResponse<PortalConfigEntity> update(@PathVariable String key, @RequestBody PortalConfigEntity updateRequest) {
        PortalConfigEntity existing = repository.findById(key)
                .orElseThrow(() -> new IllegalArgumentException("Configuration key not found: " + key));
        
        existing.setConfigValue(updateRequest.getConfigValue());
        if (updateRequest.getDescription() != null) {
            existing.setDescription(updateRequest.getDescription());
        }
        
        return ApiResponse.ok(repository.save(existing));
    }
}
