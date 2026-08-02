package com.automationportal.modules;

import org.springframework.stereotype.Service;

/**
 * Idempotent module upsert, framework-scoped (a module code is unique per framework, not
 * globally — see the V14 migration). Extracted out of DataSeeder so a future admin-triggered
 * sync (e.g. walking a framework's own project for discoverable modules, the way
 * FrameworkRunnerService.handlePlaywrightSuites() already discovers spec folders) can call the
 * exact same upsert logic instead of duplicating it.
 */
@Service
public class ModuleSyncService {
    private final ModuleRepository moduleRepository;

    public ModuleSyncService(ModuleRepository moduleRepository) {
        this.moduleRepository = moduleRepository;
    }

    public ModuleEntity upsert(String code, String name, String runTarget, String reportPath, String framework) {
        return moduleRepository.findByCodeAndRunnerType(code, framework).map(m -> {
            boolean changed = false;
            if (runTarget != null && !runTarget.equals(m.getXmlFile())) {
                m.setXmlFile(runTarget);
                changed = true;
            }
            if (reportPath != null && !reportPath.equals(m.getReportPath())) {
                m.setReportPath(reportPath);
                changed = true;
            }
            return changed ? moduleRepository.save(m) : m;
        }).orElseGet(() -> {
            ModuleEntity m = new ModuleEntity(code, name);
            m.setXmlFile(runTarget);
            m.setReportPath(reportPath);
            m.setRunnerType(framework);
            return moduleRepository.save(m);
        });
    }
}
