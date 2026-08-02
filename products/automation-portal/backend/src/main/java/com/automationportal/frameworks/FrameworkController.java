package com.automationportal.frameworks;

import com.automationportal.common.ApiResponse;
import org.springframework.web.bind.annotation.*;

import java.util.Collection;

@RestController
@RequestMapping("/api/frameworks")
public class FrameworkController {
    private final FrameworkRegistry registry;

    public FrameworkController(FrameworkRegistry registry) {
        this.registry = registry;
    }

    @GetMapping
    public ApiResponse<Collection<FrameworkDescriptor>> list() {
        return ApiResponse.ok(registry.list());
    }
}
