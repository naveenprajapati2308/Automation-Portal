package com.automationportal.perftesting.virtualuser;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VirtualUserRepository extends JpaRepository<VirtualUser, Long> {

    List<VirtualUser> findByProjectId(Long projectId);
}
