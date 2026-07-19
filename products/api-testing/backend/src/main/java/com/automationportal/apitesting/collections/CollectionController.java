package com.automationportal.apitesting.collections;

import com.automationportal.apitesting.execution.ExecutionEngineService;
import com.automationportal.apitesting.execution.dto.ExecutionRequest;
import com.automationportal.apitesting.execution.dto.ExecutionResponse;
import com.automationportal.apitesting.history.ExecutionHistory;
import com.automationportal.apitesting.history.ExecutionHistoryRepository;
import com.automationportal.apitesting.history.ExecutionHistoryService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/v1/collections")
@RequiredArgsConstructor
public class CollectionController {

    private final ApiCollectionRepository collectionRepository;
    private final CollectionRequestRepository requestRepository;
    private final PostmanImportService postmanImportService;
    private final PostmanExportService postmanExportService;
    private final OpenApiImportService openApiImportService;
    private final ExecutionEngineService executionEngineService;
    private final ExecutionHistoryService executionHistoryService;
    private final ExecutionHistoryRepository executionHistoryRepository;
    private final CollectionVariableResolver variableResolver;
    private final CollectionEnvironmentRepository environmentRepository;
    private final CollectionFolderRepository folderRepository;
    private final ObjectMapper objectMapper;

    @Data
    public static class CollectionPayload {
        @NotBlank private String name;
        private String description;
    }

    @Data
    public static class VariablesPayload {
        @NotNull private List<com.automationportal.apitesting.execution.dto.KeyValueItem> variables;
    }

    @Data
    public static class RequestPayload {
        @NotBlank private String name;
        @NotNull private ExecutionRequest config;
        private Long folderId;
    }

    @Data
    public static class MoveRequestPayload {
        private Long folderId; // null = move to "Ungrouped"
    }

    @Data
    public static class ImportPayload {
        @NotBlank private String postmanJson;
    }

    // ---- collections ----

    @GetMapping
    public List<CollectionSummary> list() {
        return collectionRepository.findAll().stream()
                .map(c -> new CollectionSummary(c.getId(), c.getName(), c.getDescription(),
                        requestRepository.countByCollectionId(c.getId()), c.getActiveEnvironmentId()))
                .toList();
    }

    public record CollectionSummary(Long id, String name, String description, long requestCount, Long activeEnvironmentId) { }

    @PostMapping
    public ApiCollection create(@Valid @RequestBody CollectionPayload payload) {
        ApiCollection c = new ApiCollection();
        c.setName(payload.getName());
        c.setDescription(payload.getDescription());
        return collectionRepository.save(c);
    }

    @PutMapping("/{id}")
    public ApiCollection update(@PathVariable Long id, @Valid @RequestBody CollectionPayload payload) {
        ApiCollection c = findCollection(id);
        c.setName(payload.getName());
        c.setDescription(payload.getDescription());
        return collectionRepository.save(c);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        collectionRepository.deleteById(id);
    }

    // ---- collection variables (Postman-style {{key}} values, e.g. {{baseUrl}}) ----

    @GetMapping("/{id}/variables")
    public List<com.automationportal.apitesting.execution.dto.KeyValueItem> getVariables(@PathVariable Long id) {
        return variableResolver.parseVariables(findCollection(id).getVariables());
    }

    @PutMapping("/{id}/variables")
    public List<com.automationportal.apitesting.execution.dto.KeyValueItem> setVariables(
            @PathVariable Long id, @Valid @RequestBody VariablesPayload payload) {
        ApiCollection c = findCollection(id);
        c.setVariables(variableResolver.toJson(payload.getVariables()));
        collectionRepository.save(c);
        return payload.getVariables();
    }

    // ---- requests within a collection ----

    public record RequestListItem(Long id, String name, String method, String url, Long folderId,
                                  Integer lastStatusCode, String lastStatusClass,
                                  Long lastDurationMs, java.time.Instant lastExecutedAt) { }

    /**
     * Requests table for the Tester's collection landing page: each row
     * carries its own last-execution summary (status/time) and folderId (for
     * grouping under the collection's folder tree), sorted so the
     * most-recently-run request surfaces first — never-run requests sort last.
     */
    @GetMapping("/{id}/requests")
    public List<RequestListItem> requests(@PathVariable Long id) {
        findCollection(id);
        return requestRepository.findByCollectionIdOrderBySeqAsc(id).stream()
                .map(r -> {
                    ExecutionHistory last = executionHistoryRepository
                            .findFirstByApiTypeAndApiIdOrderByExecutedAtDesc(ExecutionHistory.ApiType.COLLECTION, r.getId());
                    return new RequestListItem(r.getId(), r.getName(), r.getMethod(), r.getUrl(), r.getFolderId(),
                            last == null ? null : last.getResponseStatusCode(),
                            last == null ? null : last.getResponseStatusClass(),
                            last == null ? null : last.getTotalTimeMs(),
                            last == null ? null : last.getExecutedAt());
                })
                .sorted((a, b) -> {
                    if (a.lastExecutedAt() == null && b.lastExecutedAt() == null) return 0;
                    if (a.lastExecutedAt() == null) return 1;
                    if (b.lastExecutedAt() == null) return -1;
                    return b.lastExecutedAt().compareTo(a.lastExecutedAt());
                })
                .toList();
    }

    /** Full stored config for one request — used to load the workspace page directly by route. */
    @GetMapping("/{id}/requests/{requestId}")
    public CollectionRequest getRequest(@PathVariable Long id, @PathVariable Long requestId) {
        return requestRepository.findById(requestId)
                .filter(x -> x.getCollectionId().equals(id))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found in collection"));
    }

    @PostMapping("/{id}/requests")
    @SneakyThrows
    public CollectionRequest addRequest(@PathVariable Long id, @Valid @RequestBody RequestPayload payload) {
        findCollection(id);
        CollectionRequest r = new CollectionRequest();
        r.setCollectionId(id);
        r.setSeq((int) requestRepository.countByCollectionId(id));
        apply(r, payload);
        return requestRepository.save(r);
    }

    @PutMapping("/{id}/requests/{requestId}")
    @SneakyThrows
    public CollectionRequest updateRequest(@PathVariable Long id, @PathVariable Long requestId,
                                           @Valid @RequestBody RequestPayload payload) {
        CollectionRequest r = requestRepository.findById(requestId)
                .filter(x -> x.getCollectionId().equals(id))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found in collection"));
        apply(r, payload);
        return requestRepository.save(r);
    }

    @DeleteMapping("/{id}/requests/{requestId}")
    public void deleteRequest(@PathVariable Long id, @PathVariable Long requestId) {
        CollectionRequest r = requestRepository.findById(requestId)
                .filter(x -> x.getCollectionId().equals(id))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found in collection"));
        requestRepository.delete(r);
    }

    /** Moves a request into a folder (or back to "Ungrouped" when folderId is null). */
    @PatchMapping("/{id}/requests/{requestId}/move")
    public CollectionRequest moveRequest(@PathVariable Long id, @PathVariable Long requestId,
                                        @RequestBody MoveRequestPayload payload) {
        CollectionRequest r = requestRepository.findById(requestId)
                .filter(x -> x.getCollectionId().equals(id))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found in collection"));
        r.setFolderId(payload.getFolderId());
        return requestRepository.save(r);
    }

    /**
     * Executes a saved request via the server-side engine and records the run
     * against THIS request's own history (ExecutionHistory.apiType=COLLECTION,
     * apiId=requestId) — separate from the global ad-hoc history and from
     * scheduled-run history. {{variable}} placeholders (e.g. {{baseUrl}} from
     * a Postman import) are resolved against the collection's variables
     * before the request is sent — never sent with a literal, unresolvable
     * placeholder still in the URL/headers/body/auth.
     */
    @PostMapping("/{id}/requests/{requestId}/execute")
    @SneakyThrows
    public ExecutionResponse execute(@PathVariable Long id, @PathVariable Long requestId) {
        ApiCollection collection = findCollection(id);
        CollectionRequest r = requestRepository.findById(requestId)
                .filter(x -> x.getCollectionId().equals(id))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found in collection"));
        ExecutionRequest config = objectMapper.readValue(r.getConfigJson(), ExecutionRequest.class);

        List<com.automationportal.apitesting.execution.dto.KeyValueItem> vars =
                variableResolver.parseVariables(collection.getVariables());
        if (collection.getActiveEnvironmentId() != null) {
            CollectionEnvironment env = environmentRepository.findById(collection.getActiveEnvironmentId()).orElse(null);
            if (env != null) {
                vars = variableResolver.merge(vars, variableResolver.parseVariables(env.getVariables()));
            }
        }
        variableResolver.resolve(config, vars);
        String unresolved = variableResolver.firstUnresolvedPlaceholder(config);
        if (unresolved != null) {
            ExecutionResponse blocked = ExecutionResponse.builder()
                    .success(false)
                    .errorMessage("Unresolved variable {{" + unresolved + "}} — add it under this collection's Variables and try again.")
                    .durationMs(0)
                    .build();
            executionHistoryService.record(ExecutionHistory.ApiType.COLLECTION, r.getId(), r.getName(),
                    null, null, ExecutionHistory.TriggeredBy.MANUAL, config, blocked);
            return blocked;
        }

        ExecutionResponse response = executionEngineService.execute(config);
        executionHistoryService.record(ExecutionHistory.ApiType.COLLECTION, r.getId(), r.getName(),
                null, null, ExecutionHistory.TriggeredBy.MANUAL, config, response);
        return response;
    }

    // ---- import ----

    @PostMapping("/import/postman")
    public PostmanImportService.ImportResult importPostman(@Valid @RequestBody ImportPayload payload) {
        try {
            return postmanImportService.importPostman(payload.getPostmanJson());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @Data
    public static class OpenApiImportPayload {
        @NotBlank private String specText;
    }

    @PostMapping("/import/openapi")
    public PostmanImportService.ImportResult importOpenApi(@Valid @RequestBody OpenApiImportPayload payload) {
        try {
            return openApiImportService.importSpec(payload.getSpecText());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    // ---- export ----

    @GetMapping("/{id}/export/postman")
    public ResponseEntity<ByteArrayResource> exportPostman(@PathVariable Long id) {
        ApiCollection c = findCollection(id);
        List<CollectionFolder> folders = folderRepository.findByCollectionIdOrderBySeqAsc(id);
        List<CollectionRequest> requests = requestRepository.findByCollectionIdOrderBySeqAsc(id);
        String json = postmanExportService.toPostmanCollection(c, folders, requests);
        return downloadJson(json, sanitizeFilename(c.getName()) + ".postman_collection.json");
    }

    @GetMapping("/{id}/export/json")
    public ResponseEntity<ByteArrayResource> exportJson(@PathVariable Long id) {
        ApiCollection c = findCollection(id);
        List<CollectionFolder> folders = folderRepository.findByCollectionIdOrderBySeqAsc(id);
        List<CollectionRequest> requests = requestRepository.findByCollectionIdOrderBySeqAsc(id);
        String json = postmanExportService.toNativeJson(c, folders, requests);
        return downloadJson(json, sanitizeFilename(c.getName()) + ".json");
    }

    private ResponseEntity<ByteArrayResource> downloadJson(String json, String filename) {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        // filename is already ASCII-sanitized (see sanitizeFilename) — a plain
        // .filename(name) keeps the header a simple quoted string instead of
        // Spring's RFC 2047 encoded-word form, which some frontends parse
        // incorrectly and show as a garbled download name.
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(filename).build().toString())
                .contentLength(bytes.length)
                .body(new ByteArrayResource(bytes));
    }

    /** Strips characters that are unsafe in a Content-Disposition filename. */
    private String sanitizeFilename(String name) {
        String cleaned = name == null ? "collection" : name.replaceAll("[^a-zA-Z0-9._-]+", "_");
        return cleaned.isBlank() ? "collection" : cleaned;
    }

    // ----

    private ApiCollection findCollection(Long id) {
        return collectionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Collection not found"));
    }

    @SneakyThrows
    private void apply(CollectionRequest r, RequestPayload payload) {
        r.setName(payload.getName());
        r.setMethod(payload.getConfig().getMethod().toUpperCase());
        r.setUrl(payload.getConfig().getUrl());
        r.setConfigJson(objectMapper.writeValueAsString(payload.getConfig()));
        r.setFolderId(payload.getFolderId());
    }
}
