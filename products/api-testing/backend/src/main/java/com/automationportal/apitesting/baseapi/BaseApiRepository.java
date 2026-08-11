package com.automationportal.apitesting.baseapi;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BaseApiRepository extends JpaRepository<BaseApi, Long> {

    List<BaseApi> findByModuleId(Long moduleId);

    List<BaseApi> findByProjectId(Long projectId);

    List<BaseApi> findByProjectIdAndModuleId(Long projectId, Long moduleId);

    long countByProjectId(Long projectId);
}
