package com.automationportal.perftesting.loadtest;

import com.automationportal.perftesting.common.ApiException;
import com.automationportal.perftesting.perftest.HttpMethod;
import com.automationportal.perftesting.perftest.TargetType;
import com.automationportal.perftesting.results.PerfTestRun;
import com.automationportal.perftesting.results.PerfTestRunRepository;
import com.automationportal.perftesting.results.TestType;
import com.automationportal.perftesting.security.CurrentProjectService;
import com.automationportal.perftesting.virtualuser.AuthType;
import com.automationportal.perftesting.virtualuser.VirtualUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LoadTestService {

    private final LoadTestRepository repository;
    private final PerfTestRunRepository runRepository;
    private final VirtualUserRepository virtualUserRepository;
    private final CurrentProjectService currentProjectService;

    @Transactional(readOnly = true)
    public List<LoadTestDto> getAll() {
        return repository.findByProjectId(currentProjectService.requireProjectId()).stream()
                .map(this::toDtoWithStats)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public LoadTestDto getById(Long id) {
        return toDtoWithStats(find(id));
    }

    @Transactional
    public LoadTestDto create(LoadTestDto dto) {
        LoadTest entity = LoadTest.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .projectId(currentProjectService.requireProjectId())
                .targetType(dto.getTargetType() != null ? dto.getTargetType() : TargetType.URL)
                .targetUrl(dto.getTargetUrl())
                .httpMethod(dto.getHttpMethod() != null ? dto.getHttpMethod() : HttpMethod.GET)
                .requestHeaders(dto.getRequestHeaders() != null ? dto.getRequestHeaders() : new ArrayList<>())
                .requestBody(dto.getRequestBody())
                .authType(dto.getAuthType() != null ? dto.getAuthType() : AuthType.NONE)
                .authValue(dto.getAuthValue())
                .authKeyName(dto.getAuthKeyName())
                .authKeyIn(dto.getAuthKeyIn())
                .timeoutMs(dto.getTimeoutMs() != null ? dto.getTimeoutMs() : 10000)
                .stages(dto.getStages() != null ? dto.getStages() : new ArrayList<>())
                .vuAssignments(validateVuAssignments(dto.getVuAssignments()))
                .virtualUserCount(dto.getVirtualUserCount() != null ? dto.getVirtualUserCount() : 10)
                .rampUpSeconds(dto.getRampUpSeconds() != null ? dto.getRampUpSeconds() : 30)
                .steadyDurationSeconds(dto.getSteadyDurationSeconds() != null ? dto.getSteadyDurationSeconds() : 60)
                .rampDownSeconds(dto.getRampDownSeconds() != null ? dto.getRampDownSeconds() : 15)
                .maxVirtualUsers(dto.getMaxVirtualUsers() != null ? dto.getMaxVirtualUsers() : 100)
                .thresholdP95Ms(dto.getThresholdP95Ms())
                .thresholdP99Ms(dto.getThresholdP99Ms())
                .thresholdErrorRatePct(dto.getThresholdErrorRatePct())
                .thresholdMinRps(dto.getThresholdMinRps())
                .assertions(dto.getAssertions() != null ? dto.getAssertions() : new ArrayList<>())
                .scheduleCron(dto.getScheduleCron())
                .isActive(dto.getIsActive() != null ? dto.getIsActive() : true)
                .build();

        return LoadTestDto.fromEntity(repository.save(entity));
    }

    @Transactional
    public LoadTestDto update(Long id, LoadTestDto dto) {
        LoadTest existing = find(id);

        existing.setName(dto.getName());
        existing.setDescription(dto.getDescription());
        existing.setTargetType(dto.getTargetType() != null ? dto.getTargetType() : TargetType.URL);
        existing.setTargetUrl(dto.getTargetUrl());
        existing.setHttpMethod(dto.getHttpMethod() != null ? dto.getHttpMethod() : HttpMethod.GET);
        existing.setRequestHeaders(dto.getRequestHeaders() != null ? dto.getRequestHeaders() : new ArrayList<>());
        existing.setRequestBody(dto.getRequestBody());
        existing.setAuthType(dto.getAuthType() != null ? dto.getAuthType() : AuthType.NONE);
        existing.setAuthKeyName(dto.getAuthKeyName());
        existing.setAuthKeyIn(dto.getAuthKeyIn());
        existing.setTimeoutMs(dto.getTimeoutMs() != null ? dto.getTimeoutMs() : 10000);
        existing.setStages(dto.getStages() != null ? dto.getStages() : new ArrayList<>());
        existing.setVuAssignments(validateVuAssignments(dto.getVuAssignments()));
        existing.setVirtualUserCount(dto.getVirtualUserCount() != null ? dto.getVirtualUserCount() : 10);
        existing.setRampUpSeconds(dto.getRampUpSeconds() != null ? dto.getRampUpSeconds() : 30);
        existing.setSteadyDurationSeconds(dto.getSteadyDurationSeconds() != null ? dto.getSteadyDurationSeconds() : 60);
        existing.setRampDownSeconds(dto.getRampDownSeconds() != null ? dto.getRampDownSeconds() : 15);
        existing.setMaxVirtualUsers(dto.getMaxVirtualUsers() != null ? dto.getMaxVirtualUsers() : 100);
        existing.setThresholdP95Ms(dto.getThresholdP95Ms());
        existing.setThresholdP99Ms(dto.getThresholdP99Ms());
        existing.setThresholdErrorRatePct(dto.getThresholdErrorRatePct());
        existing.setThresholdMinRps(dto.getThresholdMinRps());
        existing.setAssertions(dto.getAssertions() != null ? dto.getAssertions() : new ArrayList<>());
        existing.setScheduleCron(dto.getScheduleCron());
        existing.setIsActive(dto.getIsActive() != null ? dto.getIsActive() : true);

        if (dto.getAuthValue() != null && !isMaskedPlaceholder(dto.getAuthValue())) {
            existing.setAuthValue(dto.getAuthValue());
        } else if (dto.getAuthType() == AuthType.NONE) {
            existing.setAuthValue(null);
        }

        return LoadTestDto.fromEntity(repository.save(existing));
    }

    @Transactional
    public void delete(Long id) {
        LoadTest existing = find(id);
        repository.delete(existing);
    }

    private LoadTest find(Long id) {
        LoadTest entity = repository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Load Test not found with ID: " + id));
        if (!currentProjectService.requireProjectId().equals(entity.getProjectId())) {
            throw ApiException.notFound("Load Test not found with ID: " + id);
        }
        return entity;
    }

    private boolean isMaskedPlaceholder(String value) {
        return value.endsWith("...***") || value.equals("********");
    }

    private List<VuAssignment> validateVuAssignments(List<VuAssignment> assignments) {
        if (assignments == null || assignments.isEmpty()) {
            return new ArrayList<>();
        }
        Long projectId = currentProjectService.requireProjectId();
        for (VuAssignment assignment : assignments) {
            boolean ownedByCaller = virtualUserRepository.findById(assignment.getVirtualUserId())
                    .map(vu -> projectId.equals(vu.getProjectId()))
                    .orElse(false);
            if (!ownedByCaller) {
                throw ApiException.badRequest("Virtual User not found with ID: " + assignment.getVirtualUserId());
            }
        }
        return assignments;
    }

    private LoadTestDto toDtoWithStats(LoadTest entity) {
        LoadTestDto dto = LoadTestDto.fromEntity(entity);
        Optional<PerfTestRun> latestRun = runRepository.findLatestPassedRun(TestType.LOAD.name(), entity.getId());
        if (latestRun.isPresent()) {
            PerfTestRun run = latestRun.get();
            dto.setLastRunStatus(run.getStatus().name());
            dto.setLastRunAt(run.getStartedAt());
            dto.setLastP95Ms(run.getP95Ms());
        }
        return dto;
    }
}
