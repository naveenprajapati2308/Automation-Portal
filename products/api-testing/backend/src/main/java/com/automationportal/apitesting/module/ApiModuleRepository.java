package com.automationportal.apitesting.module;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ApiModuleRepository extends JpaRepository<ApiModule, Long> {

    List<ApiModule> findByParentModuleId(Long parentModuleId);
}
