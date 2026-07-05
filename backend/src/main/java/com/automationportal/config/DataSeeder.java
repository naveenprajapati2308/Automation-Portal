package com.automationportal.config;

import com.automationportal.environments.EnvironmentEntity;
import com.automationportal.environments.EnvironmentRepository;
import com.automationportal.modules.ModuleEntity;
import com.automationportal.modules.ModuleRepository;
import com.automationportal.users.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {
    private final UserRepository userRepository;
    private final ModuleRepository moduleRepository;
    private final EnvironmentRepository environmentRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UserRepository userRepository, ModuleRepository moduleRepository,
                      EnvironmentRepository environmentRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.moduleRepository = moduleRepository;
        this.environmentRepository = environmentRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (userRepository.findByEmail("superadmin@gmail.com").isEmpty()) {
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
            userRepository.findByEmail("superadmin@gmail.com").ifPresent(superAdmin -> {
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

        seedModule("LAND",     "Land Management",       "land.xml",     "reports/MasterReport2.html");
        seedModule("EMP_ARCH", "Architect Empanelment", "Emp_Arch.xml", "reports/MasterReport.html");
    }

    private void seedEnvironment(String code, String name) {
        if (environmentRepository.findByCode(code).isEmpty()) {
            environmentRepository.save(new EnvironmentEntity(code, name));
        }
    }

    private void seedModule(String code, String name, String xmlFile, String reportPath) {
        moduleRepository.findByCode(code).ifPresentOrElse(m -> {
            boolean changed = false;
            if (xmlFile != null && !xmlFile.equals(m.getXmlFile())) {
                m.setXmlFile(xmlFile);
                changed = true;
            }
            if (reportPath != null && !reportPath.equals(m.getReportPath())) {
                m.setReportPath(reportPath);
                changed = true;
            }
            if (changed) moduleRepository.save(m);
        }, () -> {
            ModuleEntity m = new ModuleEntity(code, name);
            m.setXmlFile(xmlFile);
            m.setReportPath(reportPath);
            moduleRepository.save(m);
        });
    }
}
