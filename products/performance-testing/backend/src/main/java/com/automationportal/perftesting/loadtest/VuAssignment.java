package com.automationportal.perftesting.loadtest;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VuAssignment {
    private Long virtualUserId;
    private Integer vuCount; // Number of concurrent users using this profile
    private String label;     // "Admin Users", "Guest Users", etc.
}
