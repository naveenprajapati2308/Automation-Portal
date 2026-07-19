package com.automationportal.apitesting.execution;

import com.automationportal.apitesting.execution.dto.ExecutionRequest;
import com.automationportal.apitesting.execution.dto.ExecutionResponse;
import com.automationportal.apitesting.history.ExecutionHistory;
import com.automationportal.apitesting.history.ExecutionHistoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Ad-hoc execution from the API Tester. Saved Base/Regular APIs execute via
 * their own endpoints; this one takes a raw request config.
 */
@RestController
@RequestMapping("/api/v1/execute")
@RequiredArgsConstructor
public class ExecutionController {

    private final ExecutionEngineService executionEngineService;
    private final ExecutionHistoryService historyService;

    @PostMapping
    public ExecutionResponse execute(@Valid @RequestBody ExecutionRequest request) {
        ExecutionResponse response = executionEngineService.execute(request);
        historyService.record(ExecutionHistory.ApiType.REGULAR, null, null, null, null,
                ExecutionHistory.TriggeredBy.MANUAL, request, response);
        return response;
    }
}
