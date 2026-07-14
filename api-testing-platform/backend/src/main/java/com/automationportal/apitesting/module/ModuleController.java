package com.automationportal.apitesting.module;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/modules")
@RequiredArgsConstructor
public class ModuleController {

    private final ApiModuleRepository repository;

    @Data
    public static class ModulePayload {
        @NotBlank(message = "Name is required")
        private String name;
        private Long parentModuleId;
        private String description;
    }

    @Data
    public static class ModuleNode {
        private Long id;
        private String name;
        private String description;
        private Long parentModuleId;
        private List<ModuleNode> children = new ArrayList<>();
    }

    /** Full module tree (roots with nested children). */
    @GetMapping
    public List<ModuleNode> tree() {
        List<ApiModule> all = repository.findAll();
        Map<Long, ModuleNode> nodes = all.stream().collect(Collectors.toMap(ApiModule::getId, m -> {
            ModuleNode n = new ModuleNode();
            n.setId(m.getId());
            n.setName(m.getName());
            n.setDescription(m.getDescription());
            n.setParentModuleId(m.getParentModuleId());
            return n;
        }));
        List<ModuleNode> roots = new ArrayList<>();
        for (ModuleNode n : nodes.values()) {
            if (n.getParentModuleId() != null && nodes.containsKey(n.getParentModuleId())) {
                nodes.get(n.getParentModuleId()).getChildren().add(n);
            } else {
                roots.add(n);
            }
        }
        roots.sort((a, b) -> a.getName().compareToIgnoreCase(b.getName()));
        return roots;
    }

    @PostMapping
    public ApiModule create(@Valid @RequestBody ModulePayload payload) {
        validateParent(payload.getParentModuleId(), null);
        ApiModule m = new ApiModule();
        m.setName(payload.getName());
        m.setParentModuleId(payload.getParentModuleId());
        m.setDescription(payload.getDescription());
        return repository.save(m);
    }

    @PutMapping("/{id}")
    public ApiModule update(@PathVariable Long id, @Valid @RequestBody ModulePayload payload) {
        ApiModule m = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Module not found"));
        validateParent(payload.getParentModuleId(), id);
        m.setName(payload.getName());
        m.setParentModuleId(payload.getParentModuleId());
        m.setDescription(payload.getDescription());
        return repository.save(m);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        if (!repository.findByParentModuleId(id).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Module has sub-modules; delete or move them first");
        }
        try {
            repository.deleteById(id);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Module is referenced by APIs; unassign them first");
        }
    }

    private void validateParent(Long parentId, Long selfId) {
        if (parentId == null) return;
        if (parentId.equals(selfId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Module cannot be its own parent");
        }
        if (!repository.existsById(parentId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parent module does not exist");
        }
    }
}
