package com.automationportal.modules;

import com.automationportal.common.ApiResponse;
import com.automationportal.environments.EnvironmentEntity;
import com.automationportal.environments.EnvironmentRepository;
import com.automationportal.frameworks.FrameworkRegistry;
import com.automationportal.moduleenvironments.ModuleEnvironmentEntity;
import com.automationportal.moduleenvironments.ModuleEnvironmentRepository;
import com.automationportal.moduleenvironments.ModuleEnvironmentResolver;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/modules")
public class ModuleController {
    private final ModuleRepository repository;
    private final ModuleEnvironmentRepository moduleEnvironmentRepository;
    private final EnvironmentRepository environmentRepository;
    private final FrameworkRegistry frameworkRegistry;
    private final java.net.http.HttpClient httpClient;

    @org.springframework.beans.factory.annotation.Value("${portal.execution-manager.url:http://localhost:8090}")
    private String executionManagerUrl;

    public ModuleController(ModuleRepository repository,
                             ModuleEnvironmentRepository moduleEnvironmentRepository,
                             EnvironmentRepository environmentRepository,
                             FrameworkRegistry frameworkRegistry) {
        this.repository = repository;
        this.moduleEnvironmentRepository = moduleEnvironmentRepository;
        this.environmentRepository = environmentRepository;
        this.frameworkRegistry = frameworkRegistry;
        this.httpClient = java.net.http.HttpClient.newBuilder()
                .connectTimeout(java.time.Duration.ofSeconds(5))
                .build();
    }

    // Public listing consumed by the Execution Center / Dashboard pickers — only modules that
    // are both active (not disabled) and visible (not hidden) ever appear here; admin screens
    // use ModuleAdminController's unfiltered listing instead.
    @GetMapping
    public ApiResponse<List<ModuleEntity>> list(@RequestParam(required = false) String framework) {
        List<ModuleEntity> modules = (framework != null && !framework.isBlank())
                ? repository.findByRunnerType(framework)
                : repository.findAll();
        return ApiResponse.ok(modules.stream()
                .filter(ModuleEntity::isActive)
                .filter(ModuleEntity::isVisible)
                .toList());
    }

    // "Load Supported Environments" step: only environments explicitly enabled for this module.
    @GetMapping("/{id}/environments")
    public ApiResponse<List<EnvironmentEntity>> supportedEnvironments(@PathVariable Long id) {
        List<Long> environmentIds = moduleEnvironmentRepository.findByModuleId(id).stream()
                .filter(ModuleEnvironmentEntity::isEnabled)
                .map(ModuleEnvironmentEntity::getEnvironmentId)
                .toList();
        List<EnvironmentEntity> environments = environmentRepository.findAllById(environmentIds).stream()
                .filter(EnvironmentEntity::isActive)
                .toList();
        return ApiResponse.ok(environments);
    }

    // "Load Configuration" / "Load Browser Options" steps: resolved, NON-SECRET run options for
    // this module+environment combination. Deliberately excludes configJson/credentials — those
    // stay admin-only via ModuleEnvironmentAdminController.
    @GetMapping("/{id}/environments/{environmentId}/options")
    public ApiResponse<Map<String, Object>> environmentOptions(@PathVariable Long id, @PathVariable Long environmentId) {
        ModuleEntity module = repository.findById(id).orElseThrow(() -> new IllegalArgumentException("Module not found: " + id));
        EnvironmentEntity environment = environmentRepository.findById(environmentId)
                .orElseThrow(() -> new IllegalArgumentException("Environment not found: " + environmentId));
        ModuleEnvironmentEntity mapping = moduleEnvironmentRepository
                .findByModuleIdAndEnvironmentIdAndEnabledTrue(id, environmentId)
                .orElseThrow(() -> new IllegalArgumentException("Module " + module.getCode() + " is not enabled for environment " + environment.getCode()));

        List<String> frameworkBrowsers = frameworkRegistry.find(module.getRunnerType())
                .map(fw -> fw.browsers())
                .orElse(List.of());

        Map<String, Object> options = new java.util.LinkedHashMap<>();
        options.put("baseUrl", ModuleEnvironmentResolver.resolveBaseUrl(mapping, environment.getBaseUrl()));
        options.put("browsers", ModuleEnvironmentResolver.resolveBrowsers(mapping, frameworkBrowsers));
        options.put("timeoutMinutes", ModuleEnvironmentResolver.resolveTimeoutMinutes(mapping, 120));
        return ApiResponse.ok(options);
    }

    // Run-scope tags (e.g. "@smoke", "@regression") discovered live from this module's own
    // spec/test titles — nothing is registered by hand anywhere, so a module with no tagged
    // tests yet just returns an empty list rather than blocking or erroring. Optional, additive
    // filter only: the Execution Center always has an unfiltered "All tests" option regardless
    // of what (if anything) comes back here.
    @GetMapping("/{id}/tags")
    public ApiResponse<List<String>> tags(@PathVariable Long id) {
        try {
            ModuleEntity module = repository.findById(id).orElse(null);
            if (module == null || module.getXmlFile() == null || module.getXmlFile().isBlank()) {
                return ApiResponse.ok(List.of());
            }
            String url = executionManagerUrl + "/em/tags?path="
                    + java.net.URLEncoder.encode(module.getXmlFile(), java.nio.charset.StandardCharsets.UTF_8);
            java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
                    .uri(java.net.URI.create(url))
                    .GET()
                    .timeout(java.time.Duration.ofSeconds(5))
                    .build();
            java.net.http.HttpResponse<String> response = httpClient.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                return ApiResponse.ok(List.of());
            }
            List<String> tags = new com.fasterxml.jackson.databind.ObjectMapper()
                    .readValue(response.body(), new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
            return ApiResponse.ok(tags);
        } catch (Exception e) {
            // Tag discovery is a convenience filter, never a hard requirement — any failure
            // (runner unreachable, malformed response) degrades to "no tags available" instead
            // of surfacing an error to a run screen the user needs to keep working.
            return ApiResponse.ok(List.of());
        }
    }
}
