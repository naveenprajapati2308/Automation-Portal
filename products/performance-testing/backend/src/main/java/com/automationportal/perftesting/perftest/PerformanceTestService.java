package com.automationportal.perftesting.perftest;

import com.automationportal.perftesting.common.ApiException;
import com.automationportal.perftesting.results.PerfTestRun;
import com.automationportal.perftesting.results.PerfTestRunRepository;
import com.automationportal.perftesting.results.TestType;
import com.automationportal.perftesting.virtualuser.AuthType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PerformanceTestService {

    private final PerformanceTestRepository repository;
    private final PerfTestRunRepository runRepository;

    @Transactional(readOnly = true)
    public List<PerformanceTestDto> getAll() {
        return repository.findAll().stream()
                .map(this::toDtoWithStats)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PerformanceTestDto getById(Long id) {
        PerformanceTest entity = repository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Performance Test not found with ID: " + id));
        return toDtoWithStats(entity);
    }

    @Transactional
    public PerformanceTestDto create(PerformanceTestDto dto) {
        PerformanceTest entity = PerformanceTest.builder()
                .name(dto.getName())
                .description(dto.getDescription())
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
                .followRedirects(dto.getFollowRedirects() != null ? dto.getFollowRedirects() : true)
                .iterations(dto.getIterations() != null ? dto.getIterations() : 100)
                .thinkTimeMs(dto.getThinkTimeMs() != null ? dto.getThinkTimeMs() : 1000)
                .thresholdP50Ms(dto.getThresholdP50Ms())
                .thresholdP75Ms(dto.getThresholdP75Ms())
                .thresholdP90Ms(dto.getThresholdP90Ms())
                .thresholdP95Ms(dto.getThresholdP95Ms())
                .thresholdP99Ms(dto.getThresholdP99Ms())
                .thresholdMaxMs(dto.getThresholdMaxMs())
                .thresholdErrorRatePct(dto.getThresholdErrorRatePct())
                .thresholdMinRps(dto.getThresholdMinRps())
                .assertions(dto.getAssertions() != null ? dto.getAssertions() : new ArrayList<>())
                .scheduleCron(dto.getScheduleCron())
                .isActive(dto.getIsActive() != null ? dto.getIsActive() : true)
                .build();

        return PerformanceTestDto.fromEntity(repository.save(entity));
    }

    @Transactional
    public PerformanceTestDto update(Long id, PerformanceTestDto dto) {
        PerformanceTest existing = repository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Performance Test not found with ID: " + id));

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
        existing.setFollowRedirects(dto.getFollowRedirects() != null ? dto.getFollowRedirects() : true);
        existing.setIterations(dto.getIterations() != null ? dto.getIterations() : 100);
        existing.setThinkTimeMs(dto.getThinkTimeMs() != null ? dto.getThinkTimeMs() : 1000);
        existing.setThresholdP50Ms(dto.getThresholdP50Ms());
        existing.setThresholdP75Ms(dto.getThresholdP75Ms());
        existing.setThresholdP90Ms(dto.getThresholdP90Ms());
        existing.setThresholdP95Ms(dto.getThresholdP95Ms());
        existing.setThresholdP99Ms(dto.getThresholdP99Ms());
        existing.setThresholdMaxMs(dto.getThresholdMaxMs());
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

        return PerformanceTestDto.fromEntity(repository.save(existing));
    }

    @Transactional
    public void delete(Long id) {
        PerformanceTest existing = repository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Performance Test not found with ID: " + id));
        repository.delete(existing);
    }

    private boolean isMaskedPlaceholder(String value) {
        return value.endsWith("...***") || value.equals("********");
    }

    private PerformanceTestDto toDtoWithStats(PerformanceTest entity) {
        PerformanceTestDto dto = PerformanceTestDto.fromEntity(entity);
        Optional<PerfTestRun> latestRun = runRepository.findLatestPassedRun(TestType.PERF.name(), entity.getId());
        if (latestRun.isPresent()) {
            PerfTestRun run = latestRun.get();
            dto.setLastRunStatus(run.getStatus().name());
            dto.setLastRunAt(run.getStartedAt());
            dto.setLastP95Ms(run.getP95Ms());
        }
        return dto;
    }
}
