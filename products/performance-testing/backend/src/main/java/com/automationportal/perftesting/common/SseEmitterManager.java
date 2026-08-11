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

    // Dashboard subscriber emitters, keyed by projectId so one project's live test data
    // is never broadcast to another project's dashboard subscribers.
    private final Map<Long, List<SseEmitter>> dashboardEmitters = new ConcurrentHashMap<>();

    public SseEmitter registerDashboardEmitter(Long projectId) {
        SseEmitter emitter = new SseEmitter(1800000L); // 30 minutes timeout
        List<SseEmitter> list = dashboardEmitters.computeIfAbsent(projectId, k -> new CopyOnWriteArrayList<>());
        list.add(emitter);

        emitter.onCompletion(() -> removeDashboardEmitter(projectId, emitter));
        emitter.onTimeout(() -> removeDashboardEmitter(projectId, emitter));
        emitter.onError((e) -> removeDashboardEmitter(projectId, emitter));

        try {
            emitter.send(SseEmitter.event()
                    .name("CONNECTED")
                    .data("Subscribed to global performance testing live stream"));
        } catch (IOException e) {
            removeDashboardEmitter(projectId, emitter);
        }

        return emitter;
    }

    private void removeDashboardEmitter(Long projectId, SseEmitter emitter) {
        List<SseEmitter> list = dashboardEmitters.get(projectId);
        if (list != null) {
            list.remove(emitter);
            if (list.isEmpty()) {
                dashboardEmitters.remove(projectId);
            }
        }
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

    public void sendRunMetric(Long runId, Long projectId, Object metricPayload) {
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

        // Also broadcast metric to that project's dashboard subscribers only
        broadcastToDashboard(projectId, "metric", metricPayload);
    }

    public void sendRunComplete(Long runId, Long projectId, Object resultPayload) {
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

        // Also broadcast completion to that project's dashboard subscribers only
        broadcastToDashboard(projectId, "complete", resultPayload);
    }

    public void sendRunError(Long runId, Long projectId, Object errorPayload) {
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

        broadcastToDashboard(projectId, "error", errorPayload);
    }

    private void broadcastToDashboard(Long projectId, String eventName, Object payload) {
        List<SseEmitter> list = dashboardEmitters.get(projectId);
        if (list == null || list.isEmpty()) {
            return;
        }
        List<SseEmitter> deadDashboardEmitters = new ArrayList<>();
        for (SseEmitter emitter : list) {
            try {
                emitter.send(SseEmitter.event()
                        .name(eventName)
                        .data(payload));
            } catch (Exception e) {
                deadDashboardEmitters.add(emitter);
            }
        }
        list.removeAll(deadDashboardEmitters);
    }
}
