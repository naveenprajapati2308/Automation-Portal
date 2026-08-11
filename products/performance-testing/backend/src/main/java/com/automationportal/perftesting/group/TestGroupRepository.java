package com.automationportal.perftesting.group;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TestGroupRepository extends JpaRepository<TestGroup, Long> {

    List<TestGroup> findByProjectId(Long projectId);

    long countByProjectId(Long projectId);
}
