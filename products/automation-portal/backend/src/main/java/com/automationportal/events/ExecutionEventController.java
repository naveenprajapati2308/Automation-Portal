package com.automationportal.events;

import com.automationportal.executions.Execution;
import com.automationportal.executions.ExecutionRepository;
import com.automationportal.testengine.TestEngineCredential;
import com.automationportal.testengine.TestEngineCredentialService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/events/execution")
public class ExecutionEventController {
    private static final Logger log = LoggerFactory.getLogger(ExecutionEventController.class);

    private final ExecutionEventService eventService;
    private final LiveBroadcastService broadcastService;
    private final TestEngineCredentialService testEngineCredentialService;
    private final ExecutionRepository executionRepository;

    @Value("${portal.events.api-key}")
    private String expectedApiKey;

    // MPHIDB's PortalApiClient pushes events fire-and-forget, so a TEST_STARTED and its matching
    // TEST_PASSED/FAILED/SKIPPED for the same test case can arrive on two Tomcat threads close
    // together. @Transactional commits only when eventService.processEvent(...) returns to this
    // caller, so the lock has to wrap the whole call here (not inside the transactional method)
    // or a second thread can still read before the first thread's insert is committed and durable.
    private final java.util.concurrent.ConcurrentHashMap<String, Object> executionLocks = new java.util.concurrent.ConcurrentHashMap<>();

    private Object lockFor(String executionCode) {
        return executionLocks.computeIfAbsent(executionCode, code -> new Object());
    }

    public ExecutionEventController(ExecutionEventService eventService, LiveBroadcastService broadcastService,
                                    TestEngineCredentialService testEngineCredentialService,
                                    ExecutionRepository executionRepository) {
        this.eventService = eventService;
        this.broadcastService = broadcastService;
        this.testEngineCredentialService = testEngineCredentialService;
        this.executionRepository = executionRepository;
    }

    @PostMapping
    public ResponseEntity<?> receiveEvent(
            @RequestHeader(value = "X-API-Key", required = false) String apiKey,
            @RequestBody ExecutionEventPayload payload) {

        // docs/version2.3.md Plan 2 §23/§24: resolve a per-engine credential first — its hash
        // maps straight to the owning project, so a cross-project event can be rejected by
        // identity rather than trusted just because the shared secret matched. Falls back to the
        // legacy global key only when the incoming key isn't a registered engine credential at
        // all, so un-migrated modules (no Test Engine linked yet) keep working unchanged.
        Optional<TestEngineCredential> engineCredential = testEngineCredentialService.validate(apiKey);
        if (engineCredential.isPresent()) {
            List<Execution> matches = executionRepository.findByExecutionCode(payload.getExecutionId());
            if (matches.isEmpty()) {
                log.warn("Execution event for unknown execution code: {}", payload.getExecutionId());
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Unknown execution");
            }
            Execution execution = matches.get(0);
            // engineCredential's owning engine's project must match — resolved via the
            // credential's testEngineId through the execution's own recorded engine, not a
            // fresh lookup, so a stale/reassigned engine can't silently widen access.
            if (execution.getTestEngineId() == null || !execution.getTestEngineId().equals(engineCredential.get().getTestEngineId())) {
                log.warn("Rejected execution event: engine credential (engineId={}) does not own execution {} (execution's engineId={})",
                        engineCredential.get().getTestEngineId(), payload.getExecutionId(), execution.getTestEngineId());
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Test Engine does not own this execution");
            }
        } else if (expectedApiKey == null || expectedApiKey.isEmpty() || !expectedApiKey.equals(apiKey)) {
            log.warn("Unauthorized execution event request for execution {}: invalid or missing X-API-Key header", payload.getExecutionId());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid or missing X-API-Key header");
        }

        try {
            synchronized (lockFor(payload.getExecutionId())) {
                eventService.processEvent(payload);
            }
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Error processing execution event", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    @GetMapping(value = "/{executionCode}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamEvents(@PathVariable String executionCode) {
        log.info("Client subscribed to SSE stream for execution: {}", executionCode);
        return broadcastService.registerEmitter(executionCode);
    }

    // Dashboard-wide stream: every execution's lifecycle events, not scoped to one code.
    // Kept as a separate endpoint/path so it can't collide with the {executionCode} route above.
    @GetMapping(value = "/dashboard/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamDashboardEvents() {
        log.info("Client subscribed to global dashboard SSE stream");
        return broadcastService.registerGlobalEmitter();
    }
}
