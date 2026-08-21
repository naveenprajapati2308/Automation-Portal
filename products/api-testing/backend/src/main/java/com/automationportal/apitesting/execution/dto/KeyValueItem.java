package com.automationportal.apitesting.execution.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class KeyValueItem {

    private String key;
    private String value;
    private boolean enabled = true;

    /** Marks this as required by business logic (independent of whatever the backend
     * actually enforces) — used by BusinessValidationService, not by normal execution. */
    private boolean required = false;
}
