package com.automationportal.events;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LiveBroadcastService {
    private static final Logger log = LoggerFactory.getLogger(LiveBroadcastService.class);
    
    // Maps executionCode -> list of active SSE emitters
    private final Map<String, List<SseEmitter>> emittersMap = new ConcurrentHashMap<>();

    public SseEmitter registerEmitter(String executionCode) {
        // 30 minutes timeout for the stream
        SseEmitter emitter = new SseEmitter(1800000L);
        
        emittersMap.computeIfAbsent(executionCode, k -> new ArrayList<>()).add(emitter);
        
        emitter.onCompletion(() -> removeEmitter(executionCode, emitter));
        emitter.onTimeout(() -> removeEmitter(executionCode, emitter));
        emitter.onError((e) -> removeEmitter(executionCode, emitter));

        // Send initial connection message to check if it's alive
        try {
            emitter.send(SseEmitter.event()
                    .name("CONNECTED")
                    .data("Subscribed to live events for: " + executionCode));
        } catch (IOException e) {
            removeEmitter(executionCode, emitter);
        }

        return emitter;
    }

    private void removeEmitter(String executionCode, SseEmitter emitter) {
        List<SseEmitter> list = emittersMap.get(executionCode);
        if (list != null) {
            list.remove(emitter);
            if (list.isEmpty()) {
                emittersMap.remove(executionCode);
            }
        }
    }

    public void broadcast(String executionCode, ExecutionEventPayload payload) {
        List<SseEmitter> list = emittersMap.get(executionCode);
        if (list == null || list.isEmpty()) {
            return;
        }

        List<SseEmitter> deadEmitters = new ArrayList<>();
        for (SseEmitter emitter : list) {
            try {
                emitter.send(SseEmitter.event()
                        .name(payload.getEventType().name())
                        .data(payload));
            } catch (Exception e) {
                deadEmitters.add(emitter);
            }
        }

        for (SseEmitter dead : deadEmitters) {
            removeEmitter(executionCode, dead);
        }
    }
}
