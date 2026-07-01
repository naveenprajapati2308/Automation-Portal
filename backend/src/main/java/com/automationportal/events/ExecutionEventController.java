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
            eventService.processEvent(payload);
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
