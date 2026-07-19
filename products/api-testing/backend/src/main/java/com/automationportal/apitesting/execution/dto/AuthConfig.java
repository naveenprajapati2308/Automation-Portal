package com.automationportal.apitesting.execution.dto;

import lombok.Data;

@Data
public class AuthConfig {

    public enum Type { NONE, BASIC, BEARER, API_KEY }

    public enum ApiKeyLocation { HEADER, QUERY }

    private Type type = Type.NONE;

    // BASIC
    private String username;
    private String password;

    // BEARER
    private String token;

    // API_KEY
    private String keyName;
    private String keyValue;
    private ApiKeyLocation addTo = ApiKeyLocation.HEADER;
}
