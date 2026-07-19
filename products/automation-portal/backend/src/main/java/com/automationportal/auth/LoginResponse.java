package com.automationportal.auth;

import com.automationportal.users.UserProfileDto;

public record LoginResponse(String accessToken, String refreshToken, UserProfileDto user) {
}
