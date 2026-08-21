package com.automationportal.apitesting.validation;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class FieldValidationResult {
    private String key;
    private String source; // HEADER | QUERY_PARAM | FORM_DATA
    /** True when the backend's response actually complained about this field being
     * missing (its key was found somewhere in the response body). False means the
     * backend silently accepted the request without it — the gap this check exists
     * to catch. */
    private boolean enforced;
}
