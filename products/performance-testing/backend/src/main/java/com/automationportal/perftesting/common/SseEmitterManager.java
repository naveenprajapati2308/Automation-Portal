package com.automationportal.perftesting.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class SseEmitterManager {
    private static final Logger log = LoggerFactory.getLogger(SseEmitterManager.class);

    // Maps runId -> list of active SSE emitters for that performance/load test run
    private final Map<Long, List<SseEmitter>> emittersMap = new ConcurrentHashMap<>();

    // Global dashboard subscriber emitters
    private final List<SseEmitter> dashboardEmitters = new CopyOnWriteArrayList<>();

    public SseEmitter registerDashboardEmitter() {
        SseEmitter emitter = new SseEmitter(1800000L); // 30 minutes timeout
        dashboardEmitters.add(emitter);

        emitter.onCompletion(() -> dashboardEmitters.remove(emitter));
        emitter.onTimeout(() -> dashboardEmitters.remove(emitter));
        emitter.onError((e) -> dashboardEmitters.remove(emitter));

        try {
            emitter.send(SseEmitter.event()
                    .name("CONNECTED")
                    .data("Subscribed to global performance testing live stream"));
        } catch (IOException e) {
            dashboardEmitters.remove(emitter);
        }

        return emitter;
    }

    public SseEmitter registerRunEmitter(Long runId) {
        SseEmitter emitter = new SseEmitter(1800000L); // 30 minutes timeout

        emittersMap.computeIfAbsent(runId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeRunEmitter(runId, emitter));
        emitter.onTimeout(() -> removeRunEmitter(runId, emitter));
        emitter.onError((e) -> removeRunEmitter(runId, emitter));

        try {
            emitter.send(SseEmitter.event()
                    .name("CONNECTED")
                    .data("Subscribed to live updates for run: " + runId));
        } catch (IOException e) {
            removeRunEmitter(runId, emitter);
        }

        return emitter;
    }

    private void removeRunEmitter(Long runId, SseEmitter emitter) {
        List<SseEmitter> list = emittersMap.get(runId);
        if (list != null) {
            list.remove(emitter);
            if (list.isEmpty()) {
                emittersMap.remove(runId);
            }
        }
    }

    public void sendRunMetric(Long runId, Object metricPayload) {
        List<SseEmitter> list = emittersMap.get(runId);
        if (list != null && !list.isEmpty()) {
            List<SseEmitter> deadEmitters = new ArrayList<>();
            for (SseEmitter emitter : list) {
                try {
                    emitter.send(SseEmitter.event()
                            .name("metric")
                            .data(metricPayload));
                } catch (Exception e) {
                    deadEmitters.add(emitter);
                }
            }
            for (SseEmitter dead : deadEmitters) {
                removeRunEmitter(runId, dead);
            }
        }

        // Also broadcast metric to global dashboard
        broadcastToDashboard("metric", metricPayload);
    }

    public void sendRunComplete(Long runId, Object resultPayload) {
        List<SseEmitter> list = emittersMap.get(runId);
        if (list != null && !list.isEmpty()) {
            List<SseEmitter> deadEmitters = new ArrayList<>();
            for (SseEmitter emitter : list) {
                try {
                    emitter.send(SseEmitter.event()
                            .name("complete")
                            .data(resultPayload));
                } catch (Exception e) {
                    deadEmitters.add(emitter);
                }
            }
            for (SseEmitter dead : deadEmitters) {
                removeRunEmitter(runId, dead);
            }
        }

        // Also broadcast completion to dashboard
        broadcastToDashboard("complete", resultPayload);
    }

    public void sendRunError(Long runId, Object errorPayload) {
        List<SseEmitter> list = emittersMap.get(runId);
        if (list != null && !list.isEmpty()) {
            List<SseEmitter> deadEmitters = new ArrayList<>();
            for (SseEmitter emitter : list) {
                try {
                    emitter.send(SseEmitter.event()
                            .name("error")
                            .data(errorPayload));
                } catch (Exception e) {
                    deadEmitters.add(emitter);
                }
            }
            for (SseEmitter dead : deadEmitters) {
                removeRunEmitter(runId, dead);
            }
        }

        broadcastToDashboard("error", errorPayload);
    }

    private void broadcastToDashboard(String eventName, Object payload) {
        if (dashboardEmitters.isEmpty()) {
            return;
        }
        List<SseEmitter> deadDashboardEmitters = new ArrayList<>();
        for (SseEmitter emitter : dashboardEmitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name(eventName)
                        .data(payload));
            } catch (Exception e) {
                deadDashboardEmitters.add(emitter);
            }
        }
        dashboardEmitters.removeAll(deadDashboardEmitters);
    }
}
