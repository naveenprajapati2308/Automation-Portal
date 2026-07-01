package com.automationportal.events;

import java.time.LocalDateTime;
import java.util.Map;

public class ExecutionEventPayload {
    private String executionId; // This is the executionCode (String) in the database
    private ExecutionEventType eventType;
    private LocalDateTime timestamp;
    private Map<String, Object> data;

    // Getters and Setters
    public String getExecutionId() {
        return executionId;
    }

    public void setExecutionId(String executionId) {
        this.executionId = executionId;
    }

    public ExecutionEventType getEventType() {
        return eventType;
    }

    public void setEventType(ExecutionEventType eventType) {
        this.eventType = eventType;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public Map<String, Object> getData() {
        return data;
    }

    public void setData(Map<String, Object> data) {
        this.data = data;
    }
}
