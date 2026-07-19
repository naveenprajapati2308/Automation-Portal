package com.automationportal.em.repository;

import com.automationportal.em.model.RunnerRegistry;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RunnerRegistryRepository extends JpaRepository<RunnerRegistry, String> {
    List<RunnerRegistry> findByStatus(String status);
}
