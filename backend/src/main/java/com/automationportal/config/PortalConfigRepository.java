package com.automationportal.config;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PortalConfigRepository extends JpaRepository<PortalConfigEntity, String> {
}
