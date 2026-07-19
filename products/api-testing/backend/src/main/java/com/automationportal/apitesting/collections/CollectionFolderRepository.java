package com.automationportal.apitesting.collections;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CollectionFolderRepository extends JpaRepository<CollectionFolder, Long> {

    List<CollectionFolder> findByCollectionIdOrderBySeqAsc(Long collectionId);

    List<CollectionFolder> findByParentFolderId(Long parentFolderId);
}
