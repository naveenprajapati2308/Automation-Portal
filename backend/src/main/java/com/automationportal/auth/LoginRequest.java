package com.automationportal.auth;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(@NotBlank String username, @NotBlank String password, boolean rememberMe) {
}
