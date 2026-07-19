package com.automationportal.apitesting.collections;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CollectionRequestRepository extends JpaRepository<CollectionRequest, Long> {

    List<CollectionRequest> findByCollectionIdOrderBySeqAsc(Long collectionId);

    long countByCollectionId(Long collectionId);
}
