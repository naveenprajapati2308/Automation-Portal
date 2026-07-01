package com.automationportal.executions;

import com.automationportal.common.ApiResponse;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/test-cases")
public class TestStepController {

    private final TestStepRepository testStepRepository;

    public TestStepController(TestStepRepository testStepRepository) {
        this.testStepRepository = testStepRepository;
    }

    @GetMapping("/{testCaseId}/steps")
    public ApiResponse<List<TestStep>> getSteps(@PathVariable Long testCaseId) {
        return ApiResponse.ok(testStepRepository.findByTestCaseIdOrderByStepOrder(testCaseId));
    }
}
