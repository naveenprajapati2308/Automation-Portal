package com.automationportal.screenshots;

import com.automationportal.common.ApiResponse;
import com.automationportal.executions.*;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/screenshots")
public class ScreenshotController {
    private final ExecutionTestCaseRepository testCaseRepository;
    private final ExecutionRepository executionRepository;

    public ScreenshotController(ExecutionTestCaseRepository testCaseRepository,
                                ExecutionRepository executionRepository) {
        this.testCaseRepository = testCaseRepository;
        this.executionRepository = executionRepository;
    }

    public record ScreenshotDto(
        Long testCaseId,
        Long executionId,
        String executionCode,
        String moduleCode,
        String testName,
        String methodName,
        String screenshotPath,
        String failureReason
    ) {}

    @GetMapping
    public ApiResponse<List<ScreenshotDto>> list(
            @RequestParam(required = false) Long executionId) {
        
        List<ExecutionTestCase> cases = testCaseRepository.findAll().stream()
                .filter(tc -> tc.getScreenshotPath() != null && !tc.getScreenshotPath().trim().isEmpty())
                .filter(tc -> executionId == null || tc.getExecutionId().equals(executionId))
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .collect(Collectors.toList());

        // Preload executions to avoid N+1 queries
        Map<Long, String> executionMap = executionRepository.findAll().stream()
                .collect(Collectors.toMap(Execution::getId, Execution::getExecutionCode, (p1, p2) -> p1));

        List<ScreenshotDto> dtos = new ArrayList<>();
        for (ExecutionTestCase tc : cases) {
            String code = executionMap.getOrDefault(tc.getExecutionId(), "AUTO-UNKNOWN");
            dtos.add(new ScreenshotDto(
                tc.getId(),
                tc.getExecutionId(),
                code,
                tc.getModuleCode(),
                tc.getTestName(),
                tc.getMethodName(),
                tc.getScreenshotPath(),
                tc.getFailureReason()
            ));
        }

        return ApiResponse.ok(dtos);
    }
}
