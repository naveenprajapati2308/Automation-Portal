package com.automationportal.apitesting.regularapi;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RegularApiRepository extends JpaRepository<RegularApi, Long> {

    List<RegularApi> findByModuleId(Long moduleId);

    List<RegularApi> findByProjectId(Long projectId);

    List<RegularApi> findByProjectIdAndModuleId(Long projectId, Long moduleId);

    long countByProjectId(Long projectId);
}
