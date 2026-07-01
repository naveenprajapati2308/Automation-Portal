package com.automationportal.modules;

import com.automationportal.common.ApiResponse;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/modules")
public class ModuleAdminController {

    private final ModuleRepository repository;

    public ModuleAdminController(ModuleRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public ApiResponse<List<ModuleEntity>> list() {
        return ApiResponse.ok(repository.findAll());
    }

    @PostMapping
    public ApiResponse<ModuleEntity> create(@RequestBody ModuleEntity body) {
        if (repository.findByCode(body.getCode()).isPresent()) {
            throw new IllegalArgumentException("Module with code '" + body.getCode() + "' already exists.");
        }
        ModuleEntity m = new ModuleEntity(body.getCode(), body.getName());
        m.setDescription(body.getDescription());
        m.setXmlFile(body.getXmlFile());
        m.setReportPath(body.getReportPath());
        return ApiResponse.ok(repository.save(m));
    }

    @PutMapping("/{id}")
    public ApiResponse<ModuleEntity> update(@PathVariable Long id, @RequestBody ModuleEntity body) {
        ModuleEntity m = repository.findById(id).orElseThrow();
        m.setName(body.getName());
        m.setDescription(body.getDescription());
        m.setXmlFile(body.getXmlFile());
        m.setReportPath(body.getReportPath());
        m.setActive(body.isActive());
        return ApiResponse.ok(repository.save(m));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        repository.deleteById(id);
        return ApiResponse.ok(null);
    }

    @PatchMapping("/{id}/toggle")
    public ApiResponse<ModuleEntity> toggle(@PathVariable Long id) {
        ModuleEntity m = repository.findById(id).orElseThrow();
        m.setActive(!m.isActive());
        return ApiResponse.ok(repository.save(m));
    }

    @GetMapping("/test-connection")
    public ApiResponse<Map<String, Object>> testConnection() {
        long count = repository.count();
        return ApiResponse.ok(Map.of("modulesInDb", count, "status", "ok"));
    }
}
