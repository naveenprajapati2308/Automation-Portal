package com.automationportal.apitesting.report;

import lombok.Data;

import java.time.Instant;
import java.util.List;

/** Everything shown in an execution report: run-level header + one block per API call. */
@Data
public class ReportData {
    /** SCHEDULE_API (a lone scheduled Regular API) or GROUP. */
    private String reportType;
    private String targetName;
    private String status;
    private String triggeredBy;
    private String triggeredByEmail;
    private String recipients;
    private Instant startedAt;
    private Instant finishedAt;
    private int totalApis;
    private int passedApis;
    private int failedApis;
    private Double healthPercent;
    private List<ApiCallBlock> calls;
}
