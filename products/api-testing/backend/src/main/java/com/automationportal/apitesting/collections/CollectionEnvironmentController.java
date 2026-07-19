package com.automationportal.apitesting.collections;

import com.automationportal.apitesting.execution.dto.KeyValueItem;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * Named, switchable variable sets scoped to one collection (Dev/QA/Prod) —
 * distinct from the collection's own always-on "variables" (e.g. imported
 * from Postman). The active environment's values override collection
 * variables on key conflict at execution time.
 */
@RestController
@RequestMapping("/api/v1/collections/{collectionId}/environments")
@RequiredArgsConstructor
public class CollectionEnvironmentController {

    private final CollectionEnvironmentRepository environmentRepository;
    private final ApiCollectionRepository collectionRepository;
    private final CollectionVariableResolver variableResolver;

    @Data
    public static class EnvironmentPayload {
        @NotBlank private String name;
        @NotNull private List<KeyValueItem> variables;
    }

    @Data
    public static class ActivatePayload {
        private Long environmentId; // null = deactivate (no environment)
    }

    @GetMapping
    public List<CollectionEnvironment> list(@PathVariable Long collectionId) {
        return environmentRepository.findByCollectionIdOrderByName(collectionId);
    }

    @PostMapping
    public CollectionEnvironment create(@PathVariable Long collectionId, @Valid @RequestBody EnvironmentPayload payload) {
        findCollection(collectionId);
        CollectionEnvironment env = new CollectionEnvironment();
        env.setCollectionId(collectionId);
        apply(env, payload);
        try {
            return environmentRepository.save(env);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An environment named '" + payload.getName() + "' already exists in this collection");
        }
    }

    @PutMapping("/{envId}")
    public CollectionEnvironment update(@PathVariable Long collectionId, @PathVariable Long envId,
                                        @Valid @RequestBody EnvironmentPayload payload) {
        CollectionEnvironment env = find(collectionId, envId);
        apply(env, payload);
        return environmentRepository.save(env);
    }

    @DeleteMapping("/{envId}")
    public void delete(@PathVariable Long collectionId, @PathVariable Long envId) {
        find(collectionId, envId);
        ApiCollection c = findCollection(collectionId);
        if (envId.equals(c.getActiveEnvironmentId())) {
            c.setActiveEnvironmentId(null);
            collectionRepository.save(c);
        }
        environmentRepository.deleteById(envId);
    }

    /** Switches which environment is active for this collection (or clears it). */
    @PatchMapping("/active")
    public ApiCollection setActive(@PathVariable Long collectionId, @RequestBody ActivatePayload payload) {
        ApiCollection c = findCollection(collectionId);
        if (payload.getEnvironmentId() != null) {
            find(collectionId, payload.getEnvironmentId());
        }
        c.setActiveEnvironmentId(payload.getEnvironmentId());
        return collectionRepository.save(c);
    }

    private void apply(CollectionEnvironment env, EnvironmentPayload payload) {
        env.setName(payload.getName());
        env.setVariables(variableResolver.toJson(payload.getVariables()));
    }

    private CollectionEnvironment find(Long collectionId, Long envId) {
        return environmentRepository.findById(envId)
                .filter(e -> e.getCollectionId().equals(collectionId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Environment not found in collection"));
    }

    private ApiCollection findCollection(Long id) {
        return collectionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Collection not found"));
    }
}
