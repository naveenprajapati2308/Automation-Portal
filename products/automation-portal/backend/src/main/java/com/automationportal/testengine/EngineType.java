package com.automationportal.testengine;

public enum EngineType {
    SELENIUM, PLAYWRIGHT;

    /** Short code used in generated business IDs (ENG-SEL-000001 / ENG-PW-000001, docs/version2.3.md §3). */
    public String idPrefix() {
        return switch (this) {
            case SELENIUM -> "ENG-SEL";
            case PLAYWRIGHT -> "ENG-PW";
        };
    }
}
