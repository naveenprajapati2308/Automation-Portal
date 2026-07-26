package com.automationportal.perftesting.volume;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VolumeTestConfig {
    private String tableName;
    private String selectQuery;
    private List<Integer> milestones; // e.g. [100000, 500000, 1000000]
    private Integer seedMultiplier;   // how many rows to seed per batch
}
