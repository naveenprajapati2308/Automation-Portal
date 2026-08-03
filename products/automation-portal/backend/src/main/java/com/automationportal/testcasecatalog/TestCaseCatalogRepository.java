package com.automationportal.testcasecatalog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface TestCaseCatalogRepository extends JpaRepository<TestCaseCatalogEntity, Long> {

    @Query("SELECT c.moduleCode, c.framework, COUNT(c) FROM TestCaseCatalogEntity c " +
           "WHERE c.active = true GROUP BY c.moduleCode, c.framework")
    List<Object[]> countActiveGroupedByModuleAndFramework();
}
