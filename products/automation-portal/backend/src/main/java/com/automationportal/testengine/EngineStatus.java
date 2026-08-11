package com.automationportal.testengine;

/** Trimmed from docs/version2.3.md §33's full lifecycle (REGISTERED..DELETED) — CONNECTING/BUSY/
 *  IDLE collapse into ACTIVE (per-run busy/idle state is already tracked on RunnerRegistry, not
 *  needed a second time here); DELETED isn't a state, disabling+leaving the row is (audit trail). */
public enum EngineStatus {
    REGISTERED, ACTIVE, OFFLINE, DISABLED
}
