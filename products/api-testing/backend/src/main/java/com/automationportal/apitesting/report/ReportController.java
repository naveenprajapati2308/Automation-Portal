package com.automationportal.apitesting.report;

import com.automationportal.apitesting.group.ApiGroup;
import com.automationportal.apitesting.group.ApiGroupExecution;
import com.automationportal.apitesting.group.ApiGroupExecutionRepository;
import com.automationportal.apitesting.group.ApiGroupRepository;
import com.automationportal.apitesting.history.ExecutionHistory;
import com.automationportal.apitesting.history.ExecutionHistoryRepository;
import com.automationportal.apitesting.security.CurrentProjectService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Read-only view over execution reports for the Reports tab — same underlying data ReportService
 * already assembles for email, exposed for browsing + on-demand PDF/MD download.
 */
@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ExecutionHistoryRepository historyRepository;
    private final ApiGroupExecutionRepository executionRepository;
    private final ApiGroupRepository groupRepository;
    private final ReportService reportService;
    private final ReportMarkdownRenderer markdownRenderer;
    private final ReportPdfRenderer pdfRenderer;
    private final CurrentProjectService currentProjectService;

    @Data
    public static class ReportListItem {
        private String type;
        private Long id;
        private String targetName;
        private String status;
        private String triggeredBy;
        private String triggeredByEmail;
        private Instant startedAt;
        private Instant finishedAt;
        private Double healthPercent;
        private boolean emailSent;
    }

    @GetMapping
    public List<ReportListItem> list(@RequestParam(defaultValue = "0") int page,
                                     @RequestParam(defaultValue = "25") int size) {
        Long projectId = currentProjectService.requireProjectId();
        PageRequest pr = PageRequest.of(page, Math.min(size, 100));
        List<ReportListItem> items = new ArrayList<>();

        for (ExecutionHistory h : historyRepository.findByProjectIdAndTriggeredByAndGroupExecutionIdIsNullOrderByExecutedAtDesc(
                projectId, ExecutionHistory.TriggeredBy.SCHEDULE, pr)) {
            ReportListItem item = new ReportListItem();
            item.setType("SCHEDULE_API");
            item.setId(h.getId());
            item.setTargetName(h.getApiName());
            boolean passed = h.getResponseStatusCode() != null && h.getResponseStatusCode() < 400 && h.getErrorMessage() == null
                    && (h.getValidationPassed() == null || h.getValidationPassed());
            item.setStatus(passed ? "SUCCESS" : "FAILED");
            item.setTriggeredBy("SCHEDULE");
            item.setStartedAt(h.getStartedAt());
            item.setFinishedAt(h.getFinishedAt());
            item.setHealthPercent(passed ? 100.0 : 0.0);
            items.add(item);
        }

        for (ApiGroupExecution e : executionRepository.findByProjectIdOrderByStartedAtDesc(projectId, pr)) {
            ReportListItem item = new ReportListItem();
            item.setType("GROUP");
            item.setId(e.getId());
            item.setTargetName(groupRepository.findById(e.getGroupId()).map(ApiGroup::getName).orElse("(deleted)"));
            item.setStatus(e.getStatus().name());
            item.setTriggeredBy(e.getTriggeredBy().name());
            item.setTriggeredByEmail(e.getTriggeredByEmail());
            item.setStartedAt(e.getStartedAt());
            item.setFinishedAt(e.getFinishedAt());
            item.setHealthPercent(e.getHealthPercent());
            item.setEmailSent(e.getReportEmailSentAt() != null);
            items.add(item);
        }

        items.sort(Comparator.comparing(ReportListItem::getStartedAt, Comparator.nullsLast(Comparator.reverseOrder())));
        return items;
    }

    @GetMapping("/history/{id}/pdf")
    public ResponseEntity<byte[]> historyPdf(@PathVariable Long id) {
        requireHistoryOwnership(id);
        return pdfResponse(pdfRenderer.render(reportService.buildForHistory(id)));
    }

    @GetMapping("/history/{id}/md")
    public ResponseEntity<byte[]> historyMd(@PathVariable Long id) {
        requireHistoryOwnership(id);
        return mdResponse(markdownRenderer.render(reportService.buildForHistory(id)));
    }

    @GetMapping("/group/{groupExecutionId}/pdf")
    public ResponseEntity<byte[]> groupPdf(@PathVariable Long groupExecutionId) {
        requireGroupOwnership(groupExecutionId);
        return pdfResponse(pdfRenderer.render(reportService.buildForGroupExecution(groupExecutionId)));
    }

    @GetMapping("/group/{groupExecutionId}/md")
    public ResponseEntity<byte[]> groupMd(@PathVariable Long groupExecutionId) {
        requireGroupOwnership(groupExecutionId);
        return mdResponse(markdownRenderer.render(reportService.buildForGroupExecution(groupExecutionId)));
    }

    private void requireHistoryOwnership(Long id) {
        ExecutionHistory h = historyRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Execution not found"));
        if (!currentProjectService.requireProjectId().equals(h.getProjectId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Execution not found");
        }
    }

    private void requireGroupOwnership(Long groupExecutionId) {
        ApiGroupExecution e = executionRepository.findById(groupExecutionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group execution not found"));
        if (!currentProjectService.requireProjectId().equals(e.getProjectId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Group execution not found");
        }
    }

    private ResponseEntity<byte[]> pdfResponse(byte[] bytes) {
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=execution-report.pdf")
                .body(bytes);
    }

    private ResponseEntity<byte[]> mdResponse(String markdown) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/markdown;charset=UTF-8"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=execution-report.md")
                .body(markdown.getBytes(StandardCharsets.UTF_8));
    }
}
