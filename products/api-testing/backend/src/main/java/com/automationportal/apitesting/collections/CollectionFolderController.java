package com.automationportal.apitesting.collections;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** Nested folders within one collection (Postman's folder tree). */
@RestController
@RequestMapping("/api/v1/collections/{collectionId}/folders")
@RequiredArgsConstructor
public class CollectionFolderController {

    private final CollectionFolderRepository folderRepository;
    private final CollectionRequestRepository requestRepository;
    private final ApiCollectionRepository collectionRepository;

    @Data
    public static class FolderPayload {
        @NotBlank private String name;
        private Long parentFolderId;
    }

    @Data
    public static class FolderNode {
        private Long id;
        private String name;
        private Long parentFolderId;
        private List<FolderNode> children = new ArrayList<>();
    }

    @GetMapping
    public List<FolderNode> tree(@PathVariable Long collectionId) {
        List<CollectionFolder> all = folderRepository.findByCollectionIdOrderBySeqAsc(collectionId);
        Map<Long, FolderNode> nodes = all.stream().collect(Collectors.toMap(CollectionFolder::getId, f -> {
            FolderNode n = new FolderNode();
            n.setId(f.getId());
            n.setName(f.getName());
            n.setParentFolderId(f.getParentFolderId());
            return n;
        }));
        List<FolderNode> roots = new ArrayList<>();
        for (FolderNode n : nodes.values()) {
            if (n.getParentFolderId() != null && nodes.containsKey(n.getParentFolderId())) {
                nodes.get(n.getParentFolderId()).getChildren().add(n);
            } else {
                roots.add(n);
            }
        }
        return roots;
    }

    @PostMapping
    public CollectionFolder create(@PathVariable Long collectionId, @Valid @RequestBody FolderPayload payload) {
        findCollection(collectionId);
        validateParent(collectionId, payload.getParentFolderId(), null);
        CollectionFolder f = new CollectionFolder();
        f.setCollectionId(collectionId);
        f.setName(payload.getName());
        f.setParentFolderId(payload.getParentFolderId());
        f.setSeq(folderRepository.findByCollectionIdOrderBySeqAsc(collectionId).size());
        return folderRepository.save(f);
    }

    @PutMapping("/{folderId}")
    public CollectionFolder update(@PathVariable Long collectionId, @PathVariable Long folderId,
                                   @Valid @RequestBody FolderPayload payload) {
        CollectionFolder f = find(collectionId, folderId);
        validateParent(collectionId, payload.getParentFolderId(), folderId);
        f.setName(payload.getName());
        f.setParentFolderId(payload.getParentFolderId());
        return folderRepository.save(f);
    }

    @DeleteMapping("/{folderId}")
    public void delete(@PathVariable Long collectionId, @PathVariable Long folderId) {
        find(collectionId, folderId);
        // Requests inside fall back to "Ungrouped" (FK ON DELETE SET NULL);
        // sub-folders cascade-delete with their own contents doing the same.
        folderRepository.deleteById(folderId);
    }

    private void validateParent(Long collectionId, Long parentId, Long selfId) {
        if (parentId == null) return;
        if (parentId.equals(selfId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Folder cannot be its own parent");
        }
        CollectionFolder parent = folderRepository.findById(parentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parent folder does not exist"));
        if (!parent.getCollectionId().equals(collectionId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parent folder belongs to a different collection");
        }
    }

    private CollectionFolder find(Long collectionId, Long folderId) {
        return folderRepository.findById(folderId)
                .filter(f -> f.getCollectionId().equals(collectionId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found in collection"));
    }

    private void findCollection(Long id) {
        collectionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Collection not found"));
    }
}
