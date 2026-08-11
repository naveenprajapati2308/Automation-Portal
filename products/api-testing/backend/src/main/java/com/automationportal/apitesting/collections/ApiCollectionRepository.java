package com.automationportal.apitesting.collections;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ApiCollectionRepository extends JpaRepository<ApiCollection, Long> {

    List<ApiCollection> findByProjectId(Long projectId);
}
