package com.automationportal.perftesting.virtualuser;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VirtualUserRepository extends JpaRepository<VirtualUser, Long> {
}
