package com.automationportal.auth;

import com.automationportal.audit.AuditAction;
import com.automationportal.audit.AuditService;
import com.automationportal.common.ApiResponse;
import com.automationportal.users.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final OtpService otpService;
    private final AuthenticatedUserService authenticatedUserService;
    private final AuditService auditService;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService,
                          RefreshTokenService refreshTokenService, OtpService otpService,
                          AuthenticatedUserService authenticatedUserService, AuditService auditService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.otpService = otpService;
        this.authenticatedUserService = authenticatedUserService;
        this.auditService = auditService;
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest) {
        User user = userRepository.findByUsername(request.username()).orElse(null);
        if (user == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            auditService.record(user, AuditAction.FAILED_LOGIN, "Invalid username or password", servletRequest);
            throw new IllegalArgumentException("Invalid username or password");
        }
        if (user.getStatus() != UserStatus.ACTIVE || !user.isEmailVerified()) {
            throw new IllegalArgumentException("Account is not active or email is not verified");
        }
        user.setLastLogin(Instant.now());
        userRepository.save(user);
        refreshTokenService.revokeActiveTokensFor(user);
        RefreshToken refreshToken = refreshTokenService.create(user, request.rememberMe());
        auditService.record(user, AuditAction.LOGIN, "User logged in", servletRequest);
        return ApiResponse.ok(new LoginResponse(jwtService.createAccessToken(user), refreshToken.getToken(), UserProfileDto.from(user)));
    }

    @PostMapping("/refresh")
    public ApiResponse<LoginResponse> refresh(@Valid @RequestBody AuthDtos.RefreshRequest request) {
        RefreshToken refreshToken = refreshTokenService.rotate(request.refreshToken());
        User user = refreshToken.getUser();
        return ApiResponse.ok(new LoginResponse(jwtService.createAccessToken(user), refreshToken.getToken(), UserProfileDto.from(user)));
    }

    @PostMapping("/logout")
    public ApiResponse<Map<String, String>> logout(@Valid @RequestBody AuthDtos.LogoutRequest request, HttpServletRequest servletRequest) {
        refreshTokenService.revoke(request.refreshToken());
        User user = authenticatedUserService.currentUser();
        auditService.record(user, AuditAction.LOGOUT, "User logged out", servletRequest);
        return ApiResponse.ok(Map.of("status", "logged_out"));
    }

    @GetMapping("/me")
    public ApiResponse<UserProfileDto> me() {
        return ApiResponse.ok(UserProfileDto.from(authenticatedUserService.currentUser()));
    }

    @PostMapping("/forgot-password")
    public ApiResponse<Map<String, String>> forgotPassword(@Valid @RequestBody AuthDtos.ForgotPasswordRequest request, HttpServletRequest servletRequest) {
        User user = userRepository.findByEmail(request.email()).orElseThrow(() -> new IllegalArgumentException("Email not found"));
        String otp = otpService.send(user.getUsername(), user.getEmail(), OtpPurpose.FORGOT_PASSWORD);
        auditService.record(user, AuditAction.OTP_SENT, "Forgot password OTP sent", servletRequest);
        return ApiResponse.ok(Map.of("status", "otp_sent", "otp", otp));
    }

    @PostMapping("/reset-password")
    public ApiResponse<Map<String, String>> resetPassword(@Valid @RequestBody AuthDtos.ResetPasswordRequest request, HttpServletRequest servletRequest) {
        validatePassword(request.newPassword());
        otpService.verify(request.email(), request.otp(), OtpPurpose.FORGOT_PASSWORD);
        User user = userRepository.findByEmail(request.email()).orElseThrow();
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        auditService.record(user, AuditAction.PASSWORD_RESET, "Password reset completed", servletRequest);
        return ApiResponse.ok(Map.of("status", "password_reset"));
    }

    @PostMapping("/change-password")
    public ApiResponse<Map<String, String>> changePassword(@Valid @RequestBody AuthDtos.ChangePasswordRequest request, HttpServletRequest servletRequest) {
        validatePassword(request.newPassword());
        User user = authenticatedUserService.currentUser();
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        auditService.record(user, AuditAction.PASSWORD_CHANGE, "Password changed", servletRequest);
        return ApiResponse.ok(Map.of("status", "password_changed"));
    }

    @GetMapping("/google/login-url")
    public ApiResponse<Map<String, String>> googleLoginUrl() {
        return ApiResponse.ok(Map.of(
            "loginUrl", "/oauth2/authorization/google",
            "note", "Configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable Google OAuth2 login"
        ));
    }

    private void validatePassword(String password) {
        if (password.length() < 8
            || !password.matches(".*[A-Z].*")
            || !password.matches(".*[a-z].*")
            || !password.matches(".*\\d.*")
            || !password.matches(".*[^A-Za-z0-9].*")) {
            throw new IllegalArgumentException("Password must be 8+ chars with uppercase, lowercase, number, and special character");
        }
    }
}
