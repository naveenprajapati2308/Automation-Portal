package com.automationportal.environments;

import com.automationportal.common.ApiResponse;
import com.automationportal.common.EntityIdGeneratorService;
import com.automationportal.workspace.CurrentProjectService;
import com.automationportal.workspace.Project;
import com.automationportal.workspace.ProjectRepository;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;

/**
 * Real cross-project environment administration for Super Admin — gated by the blanket
 * /api/admin/** -> hasRole("SUPER_ADMIN") rule in SecurityConfig. Mirrors ModuleAdminController's
 * shape. Replaces the old AdminEnvironmentsEmbed iframe (which reused the live, project-scoped
 * EnvironmentController — the exact workspace-UI access docs/version2.2.md says Super Admin must
 * never have).
 */
@RestController
@RequestMapping("/api/admin/environments")
public class EnvironmentAdminController {

    private final EnvironmentRepository repository;
    private final ProjectRepository projectRepository;
    private final EntityIdGeneratorService entityIdGeneratorService;
    private final CurrentProjectService currentProjectService;

    public EnvironmentAdminController(EnvironmentRepository repository,
                                       ProjectRepository projectRepository,
                                       EntityIdGeneratorService entityIdGeneratorService,
                                       CurrentProjectService currentProjectService) {
        this.repository = repository;
        this.projectRepository = projectRepository;
        this.entityIdGeneratorService = entityIdGeneratorService;
        this.currentProjectService = currentProjectService;
    }

    public record EnvironmentAdminDto(
            Long id, String businessId, Long projectId, String projectName, String projectCode,
            String code, String name, String baseUrl, boolean active) {
    }

    @GetMapping
    public ApiResponse<List<EnvironmentAdminDto>> list() {
        List<EnvironmentEntity> environments = repository.findAll();
        Map<Long, Project> projectsById = projectRepository.findAllById(
                environments.stream().map(EnvironmentEntity::getProjectId).distinct().toList()
        ).stream().collect(java.util.stream.Collectors.toMap(Project::getId, p -> p));
        return ApiResponse.ok(environments.stream().map(e -> {
            Project project = projectsById.get(e.getProjectId());
            return new EnvironmentAdminDto(
                    e.getId(), e.getBusinessId(), e.getProjectId(),
                    project != null ? project.getName() : null,
                    project != null ? project.getProjectCode() : null,
                    e.getCode(), e.getName(), e.getBaseUrl(), e.isActive());
        }).toList());
    }

    @PostMapping
    public ApiResponse<EnvironmentEntity> create(@RequestBody Map<String, Object> body) {
        String code = asString(body.get("code"));
        String name = asString(body.get("name"));
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("Code is required");
        }
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Name is required");
        }
        EnvironmentEntity entity = new EnvironmentEntity(code, name);
        entity.setBaseUrl(asString(body.get("baseUrl")));
        entity.setBusinessId(entityIdGeneratorService.next("ENV"));

        Object requestedProjectId = body.get("projectId");
        Long targetProjectId = requestedProjectId != null
                ? Long.valueOf(String.valueOf(requestedProjectId))
                : currentProjectService.defaultWorkspaceProjectId();
        projectRepository.findById(targetProjectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + targetProjectId));
        entity.setProjectId(targetProjectId);
        return ApiResponse.ok(repository.save(entity));
    }

    @PutMapping("/{id}")
    public ApiResponse<EnvironmentEntity> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        EnvironmentEntity existing = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Environment not found: " + id));
        String code = asString(body.get("code"));
        String name = asString(body.get("name"));
        if (code != null && !code.isBlank()) {
            existing.setCode(code);
        }
        if (name != null && !name.isBlank()) {
            existing.setName(name);
        }
        if (body.get("baseUrl") != null) {
            existing.setBaseUrl(asString(body.get("baseUrl")));
        }
        if (body.get("active") != null) {
            existing.setActive(Boolean.parseBoolean(String.valueOf(body.get("active"))));
        }
        return ApiResponse.ok(repository.save(existing));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<String> delete(@PathVariable Long id) {
        if (!repository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Environment not found: " + id);
        }
        repository.deleteById(id);
        return ApiResponse.ok("Environment deleted successfully");
    }

    private static String asString(Object value) {
        return value == null ? null : String.valueOf(value).trim();
    }
}
