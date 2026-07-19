package com.automationportal.apitesting.history;

import com.automationportal.apitesting.validation.ValidationResultRepository;
import com.automationportal.apitesting.validation.ValidationResultView;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/v1/history")
@RequiredArgsConstructor
public class HistoryController {

    private final ExecutionHistoryRepository repository;
    private final ValidationResultRepository validationResultRepository;
    private final BodyStore bodyStore;

    @GetMapping
    public Page<ExecutionHistory> list(
            @RequestParam(required = false) ExecutionHistory.ApiType apiType,
            @RequestParam(required = false) Long apiId,
            @RequestParam(required = false) Long moduleId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long scheduleId,
            @RequestParam(required = false) String method,
            @RequestParam(required = false) Long groupExecutionId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        Page<ExecutionHistory> result = repository.search(apiType, apiId, moduleId,
                (status == null || status.isBlank()) ? null : status,
                scheduleId,
                (method == null || method.isBlank()) ? null : method.toUpperCase(),
                groupExecutionId, from, to, PageRequest.of(page, Math.min(size, 100)));
        // List rows stay light: bodies are only returned from the detail endpoint.
        result.forEach(h -> {
            h.setResponseBodyInline(null);
            h.setRequestBody(null);
            h.setResponseHeaders(null);
            h.setRequestHeaders(null);
            h.setInjectedVariables(null);
            h.setResponseCookies(null);
        });
        return result;
    }

    @Data
    public static class HistoryDetail {
        private ExecutionHistory execution;
        private String responseBody;
        private List<ValidationResultView> validationResults;
    }

    @GetMapping("/{id}")
    public HistoryDetail detail(@PathVariable Long id) {
        ExecutionHistory h = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Execution not found"));
        HistoryDetail d = new HistoryDetail();
        d.setExecution(h);
        d.setResponseBody(h.getResponseBodyInline() != null
                ? h.getResponseBodyInline()
                : (h.getResponseBodyObjectKey() != null ? bodyStore.load(h.getResponseBodyObjectKey()) : null));
        d.setValidationResults(validationResultRepository.findViewsByExecutionId(id));
        return d;
    }
}
