package com.automationportal.apitesting.baseapi;

import jakarta.persistence.*;
import lombok.Data;

/**
 * Variable binding rows serve two roles (see V1 schema comment):
 *  - regularApiId == null: extraction definition on a Base API
 *  - regularApiId != null: a Regular API consuming that variable
 */
@Data
@Entity
@Table(name = "BASE_API_MAPPING")
public class ApiVariableBinding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "regular_api_id")
    private Long regularApiId;

    @Column(name = "base_api_id", nullable = false)
    private Long baseApiId;

    @Column(name = "source_json_path", nullable = false, length = 500)
    private String sourceJsonPath;

    @Column(name = "variable_name", nullable = false, length = 100)
    private String variableName;

    @Column(name = "target_location", nullable = false, length = 20)
    private String targetLocation = "TEMPLATE";

    @Column(name = "target_key", nullable = false, length = 200)
    private String targetKey = "";
}
