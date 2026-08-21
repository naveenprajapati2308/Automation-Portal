package com.automationportal.apitesting.execution.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * One row of a multipart/form-data request body. TEXT rows carry their value
 * inline; FILE rows carry only a reference (fileId) into FormDataFileStore —
 * actual bytes are never inlined into a saved config, so a FILE row survives
 * unattended (scheduled) execution without a browser re-supplying the file.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FormDataItem {

    public enum Type { TEXT, FILE }

    private String key;
    private String value;
    private boolean enabled = true;
    private Type type = Type.TEXT;
    private String fileId;
    private String fileName;

    /** Marks this as required by business logic (independent of whatever the backend
     * actually enforces) — used by BusinessValidationService, not by normal execution. */
    private boolean required = false;
}
