package com.automationportal.moduleenvironments;

import com.automationportal.common.ApiResponse;
import com.automationportal.environments.EnvironmentRepository;
import com.automationportal.frameworks.FrameworkRegistry;
import com.automationportal.modules.ModuleEntity;
import com.automationportal.modules.ModuleRepository;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;

/**
 * Admin-only CRUD for the Module + Environment mapping — the "future Module Controller" the
 * doc anticipates, built now rather than merely prepared for later. Unlike ModuleController's
 * public /options endpoint, responses here include configJson (may contain credentials).
 */
@RestController
@RequestMapping("/api/admin/module-environments")
public class ModuleEnvironmentAdminController {
    private final ModuleEnvironmentRepository repository;
    private final ModuleRepository moduleRepository;
    private final EnvironmentRepository environmentRepository;
    private final FrameworkRegistry frameworkRegistry;

    public ModuleEnvironmentAdminController(ModuleEnvironmentRepository repository,
                                             ModuleRepository moduleRepository,
                                             EnvironmentRepository environmentRepository,
                                             FrameworkRegistry frameworkRegistry) {
        this.repository = repository;
        this.moduleRepository = moduleRepository;
        this.environmentRepository = environmentRepository;
        this.frameworkRegistry = frameworkRegistry;
    }

    @GetMapping
    public ApiResponse<List<ModuleEnvironmentEntity>> list(@RequestParam(required = false) Long moduleId) {
        List<ModuleEnvironmentEntity> rows = moduleId != null
                ? repository.findByModuleId(moduleId)
                : repository.findAll();
        return ApiResponse.ok(rows);
    }

    @GetMapping("/{id}")
    public ApiResponse<ModuleEnvironmentEntity> get(@PathVariable Long id) {
        return ApiResponse.ok(repository.findById(id).orElseThrow());
    }

    @PostMapping
    public ApiResponse<ModuleEnvironmentEntity> create(@RequestBody ModuleEnvironmentEntity body) {
        if (body.getModuleId() == null || body.getEnvironmentId() == null) {
            throw new IllegalArgumentException("moduleId and environmentId are both required");
        }
        if (!moduleRepository.existsById(body.getModuleId())) {
            throw new IllegalArgumentException("Module not found: " + body.getModuleId());
        }
        if (!environmentRepository.existsById(body.getEnvironmentId())) {
            throw new IllegalArgumentException("Environment not found: " + body.getEnvironmentId());
        }
        if (repository.findByModuleIdAndEnvironmentId(body.getModuleId(), body.getEnvironmentId()).isPresent()) {
            throw new IllegalArgumentException("This module is already mapped to this environment.");
        }
        validateBrowsers(body.getModuleId(), body.getBrowsers());

        ModuleEnvironmentEntity entity = new ModuleEnvironmentEntity();
        entity.setModuleId(body.getModuleId());
        entity.setEnvironmentId(body.getEnvironmentId());
        applyOverrides(entity, body);
        return ApiResponse.ok(repository.save(entity));
    }

    @PutMapping("/{id}")
    public ApiResponse<ModuleEnvironmentEntity> update(@PathVariable Long id, @RequestBody ModuleEnvironmentEntity body) {
        ModuleEnvironmentEntity entity = repository.findById(id).orElseThrow();
        validateBrowsers(entity.getModuleId(), body.getBrowsers());
        applyOverrides(entity, body);
        return ApiResponse.ok(repository.save(entity));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        repository.deleteById(id);
        return ApiResponse.ok(null);
    }

    private void applyOverrides(ModuleEnvironmentEntity entity, ModuleEnvironmentEntity body) {
        entity.setEnabled(body.isEnabled());
        entity.setBaseUrl(body.getBaseUrl());
        entity.setConfigJson(body.getConfigJson());
        entity.setBrowsers(body.getBrowsers());
        entity.setTimeoutMinutes(body.getTimeoutMinutes());
        entity.setExecutionParamsJson(body.getExecutionParamsJson());
    }

    private void validateBrowsers(Long moduleId, String browsersCsv) {
        if (browsersCsv == null || browsersCsv.isBlank()) {
            return;
        }
        ModuleEntity module = moduleRepository.findById(moduleId)
                .orElseThrow(() -> new IllegalArgumentException("Module not found: " + moduleId));
        List<String> frameworkBrowsers = frameworkRegistry.find(module.getRunnerType())
                .map(fw -> fw.browsers())
                .orElse(List.of());
        List<String> requested = Arrays.stream(browsersCsv.split(","))
                .map(String::trim).filter(s -> !s.isEmpty()).toList();
        for (String browser : requested) {
            if (!frameworkBrowsers.contains(browser)) {
                throw new IllegalArgumentException(
                        "Browser '" + browser + "' is not supported by framework " + module.getRunnerType()
                                + " (supported: " + frameworkBrowsers + ")");
            }
        }
    }
}
