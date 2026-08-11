package com.automationportal.workspace;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Resolves which active Projects a user belongs to, and with which role(s) in each — the
 * "same user, different role per project" model. A user can have several {@link ProjectUser}
 * rows pointing at the same project (one per role grant), so rows are grouped by project before
 * being handed back.
 */
@Service
public class ProjectResolutionService {
    private final ProjectUserRepository projectUserRepository;
    private final ProjectModuleRepository projectModuleRepository;

    public ProjectResolutionService(ProjectUserRepository projectUserRepository,
                                    ProjectModuleRepository projectModuleRepository) {
        this.projectUserRepository = projectUserRepository;
        this.projectModuleRepository = projectModuleRepository;
    }

    /** tenantId is resolved eagerly here (not left as a lazy Project.tenant touch) since callers
     * commonly use ResolvedProject outside this method's transaction/session. */
    public record ResolvedProject(Project project, Long tenantId, List<String> roleCodes) {}

    @Transactional(readOnly = true)
    public List<ResolvedProject> activeProjects(Long userId) {
        List<ProjectUser> rows = projectUserRepository.findByUserIdAndStatus(userId, ProjectUserStatus.ACTIVE);
        Map<Long, List<ProjectUser>> byProject = rows.stream()
            .collect(Collectors.groupingBy(pu -> pu.getProject().getId()));
        return byProject.values().stream()
            .map(group -> new ResolvedProject(
                group.get(0).getProject(),
                group.get(0).getProject().getTenant().getId(),
                group.stream().map(pu -> pu.getRole().getCode()).distinct().toList()
            ))
            .sorted(Comparator.comparing(rp -> rp.project().getName()))
            .toList();
    }

    public ProjectDtos.MyProjectSummary toSummary(ResolvedProject resolved) {
        List<String> modules = projectModuleRepository.findByProjectIdAndEnabledTrue(resolved.project().getId())
            .stream().map(m -> m.getModuleType().name()).toList();
        return new ProjectDtos.MyProjectSummary(
            resolved.project().getId(), resolved.project().getProjectCode(), resolved.project().getWorkspaceCode(),
            resolved.project().getName(), modules, resolved.roleCodes()
        );
    }

    public ProjectContext toContext(ResolvedProject resolved) {
        return new ProjectContext(
            resolved.tenantId(), resolved.project().getId(),
            resolved.project().getProjectCode(), resolved.roleCodes()
        );
    }
}
