package com.automationportal.apitesting.regularapi;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RegularApiRepository extends JpaRepository<RegularApi, Long> {

    List<RegularApi> findByModuleId(Long moduleId);
}
