package com.automationportal.perftesting.schedule;

public enum ScheduleLastStatus {
    /** k6 run finished within all thresholds. */
    PASSED,
    /** k6 run finished but at least one threshold was breached. */
    FAILED,
    /** Schedule was claimed; a queue job was created and is waiting for a concurrency slot. */
    QUEUED,
    /** The queue worker has dispatched the job and k6 is actively running. */
    RUNNING,
    /** The run was aborted by a user action. */
    ABORTED,
    /** This schedule has never successfully executed. */
    NEVER_RUN,
    /** The queue job failed to dispatch (e.g. test config deleted, target inactive). */
    ERROR
}
