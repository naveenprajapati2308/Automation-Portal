package com.automationportal.integrationguide;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IntegrationGuideSectionRepository extends JpaRepository<IntegrationGuideSection, Long> {
    List<IntegrationGuideSection> findAllByOrderBySortOrderAsc();
}
