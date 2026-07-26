package com.automationportal.perftesting.results;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ThresholdResult {
    private String name;
    private Double value;
    private Boolean passed;
}
