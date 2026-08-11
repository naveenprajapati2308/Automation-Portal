package com.automationportal.apitesting.group;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ApiGroupRepository extends JpaRepository<ApiGroup, Long> {

    List<ApiGroup> findAllByOrderByUpdatedAtDesc();

    boolean existsByNameIgnoreCase(String name);

    List<ApiGroup> findByProjectIdOrderByUpdatedAtDesc(Long projectId);

    boolean existsByProjectIdAndNameIgnoreCase(Long projectId, String name);

    long countByProjectId(Long projectId);
}
