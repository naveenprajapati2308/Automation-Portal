package com.automationportal.events;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/events/execution")
public class ExecutionEventController {
    private static final Logger log = LoggerFactory.getLogger(ExecutionEventController.class);

    private final ExecutionEventService eventService;
    private final LiveBroadcastService broadcastService;

    @Value("${portal.events.api-key:shared-secret}")
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

    public ExecutionEventController(ExecutionEventService eventService, LiveBroadcastService broadcastService) {
        this.eventService = eventService;
        this.broadcastService = broadcastService;
    }

    @PostMapping
    public ResponseEntity<?> receiveEvent(
            @RequestHeader(value = "X-API-Key", required = false) String apiKey,
            @RequestBody ExecutionEventPayload payload) {

        if (expectedApiKey != null && !expectedApiKey.isEmpty() && !expectedApiKey.equals(apiKey)) {
            log.warn("Unauthorized execution event request with API key: {}", apiKey);
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
}
