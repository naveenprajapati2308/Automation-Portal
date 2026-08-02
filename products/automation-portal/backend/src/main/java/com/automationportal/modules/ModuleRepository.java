package com.automationportal.modules;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ModuleRepository extends JpaRepository<ModuleEntity, Long> {
    // Still used by the public module listing (ModuleController) which isn't framework-scoped —
    // returns whichever row matches first if the same code exists under multiple frameworks.
    Optional<ModuleEntity> findByCode(String code);

    // The framework-scoped lookup: code alone is no longer unique (see V14 migration) since the
    // same business module can exist once per framework (e.g. "LAND" under both MAVEN_TESTNG
    // and PLAYWRIGHT).
    Optional<ModuleEntity> findByCodeAndRunnerType(String code, String runnerType);

    List<ModuleEntity> findByRunnerType(String runnerType);
}
