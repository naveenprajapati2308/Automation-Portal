package com.automationportal.perftesting.loadtest;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Stage {
    private Integer durationSec;
    private Integer targetVus;
    private String label; // "Ramp Up", "Steady State", etc.
}
