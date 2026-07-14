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
}
