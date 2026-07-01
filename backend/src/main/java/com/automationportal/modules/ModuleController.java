package com.automationportal.modules;

import com.automationportal.common.ApiResponse;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/modules")
public class ModuleController {
    private final ModuleRepository repository;

    public ModuleController(ModuleRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public ApiResponse<List<ModuleEntity>> list() {
        return ApiResponse.ok(repository.findAll());
    }
}
