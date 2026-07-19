package com.automationportal.apitesting.collections;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CollectionEnvironmentRepository extends JpaRepository<CollectionEnvironment, Long> {

    List<CollectionEnvironment> findByCollectionIdOrderByName(Long collectionId);
}
