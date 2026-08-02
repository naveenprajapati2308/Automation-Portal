package com.automationportal.config;

import com.automationportal.environments.EnvironmentEntity;
import com.automationportal.environments.EnvironmentRepository;
import com.automationportal.modules.ModuleSyncService;
import com.automationportal.users.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {
    private final UserRepository userRepository;
    private final ModuleSyncService moduleSyncService;
    private final EnvironmentRepository environmentRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UserRepository userRepository, ModuleSyncService moduleSyncService,
                      EnvironmentRepository environmentRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.moduleSyncService = moduleSyncService;
        this.environmentRepository = environmentRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (userRepository.findByUsernameOrEmail("superadmin@gmail.com", "superadmin@gmail.com").isEmpty()) {
            User superAdmin = new User();
            superAdmin.setUsername("superadmin@gmail.com");
            superAdmin.setEmail("superadmin@gmail.com");
            superAdmin.setDisplayName("Super Admin");
            superAdmin.setRole(UserRole.SUPER_ADMIN);
            superAdmin.setStatus(UserStatus.ACTIVE);
            superAdmin.setEmailVerified(true);
            superAdmin.setAuthProvider("LOCAL");
            superAdmin.setPasswordHash(passwordEncoder.encode("password"));
            userRepository.save(superAdmin);
        } else {
            userRepository.findByUsernameOrEmail("superadmin@gmail.com", "superadmin@gmail.com").ifPresent(superAdmin -> {
                boolean changed = false;
                if (!"superadmin@gmail.com".equals(superAdmin.getUsername())) {
                    superAdmin.setUsername("superadmin@gmail.com");
                    changed = true;
                }
                if (superAdmin.getRole() != UserRole.SUPER_ADMIN) {
                    superAdmin.setRole(UserRole.SUPER_ADMIN);
                    changed = true;
                }
                if (!superAdmin.isEmailVerified() || superAdmin.getStatus() != UserStatus.ACTIVE) {
                    superAdmin.setEmailVerified(true);
                    superAdmin.setStatus(UserStatus.ACTIVE);
                    changed = true;
                }
                if (changed) userRepository.save(superAdmin);
            });
        }

        // Only QA/UAT ship as defaults — further environments are added from the
        // Environments page (owner's call, 2026-07-05).
        seedEnvironment("QA", "QA");
        seedEnvironment("UAT", "UAT");

        moduleSyncService.upsert("LAND",          "Land Management",       "land-v2.xml",          "reports/Land_Management_Suite.html", "MAVEN_TESTNG");
        moduleSyncService.upsert("EMP_ARCH",      "Architect Empanelment", "Emp_Arch-v2.xml",      "reports/Architect_Empanelment_Suite.html", "MAVEN_TESTNG");
        moduleSyncService.upsert("ARCH_WORKFLOW", "Architect Workflow",    "Arch_workflow-v2.xml", "reports/Architect_workflow_Suite.html", "MAVEN_TESTNG");

        // Playwright's own module folders (tests/specs/mphidb/<land|architect>/*.spec.ts) —
        // a new "ARCHITECT" code rather than reusing Selenium's EMP_ARCH/ARCH_WORKFLOW, since
        // Playwright's single "architect" spec folder maps loosely to both and forcing it onto
        // either would misrepresent coverage.
        moduleSyncService.upsert("LAND",     "Land Management",       "tests/specs/mphidb/land",      null, "PLAYWRIGHT");
        moduleSyncService.upsert("ARCHITECT", "Architect Empanelment", "tests/specs/mphidb/architect", null, "PLAYWRIGHT");

        // Per-type Architect Empanelment modules (2026-07-31): each points at its own single
        // spec file (not the whole folder) so a user can pick exactly one registration type from
        // the Execution Center, same as "ARCHITECT" above does for all 6 at once. Each of these
        // spec files now owns its own literal test() titles carrying @smoke/@regression (see
        // empanelment-flow-helpers.ts's runSmokeFlow/runRegressionFlow split) specifically so
        // framework-runner's handleTags() - which regex-scans the exact file a module's xmlFile
        // points at - finds those tags. Before this, the tagged test() calls lived only in the
        // shared helper file, so a module scoped to one type's spec would report zero tags.
        moduleSyncService.upsert("ARCHITECT_INDIVIDUAL",     "Architect Empanelment - Individual",     "tests/specs/mphidb/architect/individual-empanelment.spec.ts",     null, "PLAYWRIGHT");
        moduleSyncService.upsert("ARCHITECT_PROPRIETORSHIP", "Architect Empanelment - Proprietorship", "tests/specs/mphidb/architect/proprietorship-empanelment.spec.ts", null, "PLAYWRIGHT");
        moduleSyncService.upsert("ARCHITECT_PARTNERSHIP",    "Architect Empanelment - Partnership",    "tests/specs/mphidb/architect/partnership-empanelment.spec.ts",    null, "PLAYWRIGHT");
        moduleSyncService.upsert("ARCHITECT_PVTLTD",         "Architect Empanelment - Pvt Ltd",         "tests/specs/mphidb/architect/pvt-ltd-empanelment.spec.ts",        null, "PLAYWRIGHT");
        moduleSyncService.upsert("ARCHITECT_PUBLICLTD",      "Architect Empanelment - Public Ltd",      "tests/specs/mphidb/architect/public-ltd-empanelment.spec.ts",     null, "PLAYWRIGHT");
        moduleSyncService.upsert("ARCHITECT_LLP",            "Architect Empanelment - LLP",             "tests/specs/mphidb/architect/llp-empanelment.spec.ts",            null, "PLAYWRIGHT");
    }

    private void seedEnvironment(String code, String name) {
        if (environmentRepository.findByCode(code).isEmpty()) {
            environmentRepository.save(new EnvironmentEntity(code, name));
        }
    }
}
