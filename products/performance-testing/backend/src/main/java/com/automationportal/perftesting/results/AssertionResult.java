package com.automationportal.perftesting.results;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssertionResult {
    private String type;
    private String expected;
    private String actual;
    private Boolean passed;
}
