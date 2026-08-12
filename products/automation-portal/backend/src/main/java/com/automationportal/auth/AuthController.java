package com.automationportal.auth;

import com.automationportal.audit.AuditAction;
import com.automationportal.audit.AuditService;
import com.automationportal.common.ApiResponse;
import com.automationportal.users.*;
import com.automationportal.workspace.ProjectDtos;
import com.automationportal.workspace.ProjectResolutionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private static final Logger log = LoggerFactory.getLogger(AuthController.class);
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final OtpService otpService;
    private final AuthenticatedUserService authenticatedUserService;
    private final AuditService auditService;
    private final ProjectResolutionService projectResolutionService;
    private final MailService mailService;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService,
                          RefreshTokenService refreshTokenService, OtpService otpService,
                          AuthenticatedUserService authenticatedUserService, AuditService auditService,
                          ProjectResolutionService projectResolutionService, MailService mailService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.otpService = otpService;
        this.authenticatedUserService = authenticatedUserService;
        this.auditService = auditService;
        this.projectResolutionService = projectResolutionService;
        this.mailService = mailService;
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest) {
        User user = userRepository.findByUsernameOrEmail(request.username(), request.username()).orElse(null);
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
        return ApiResponse.ok(buildSessionResponse(user, refreshToken.getToken()));
    }

    // @Transactional so that rotate()'s revoke-old/create-new commit rolls back together with
    // this method's own validation — a failure after rotate() (e.g. buildSessionResponse's
    // zero-projects check) must not leave the caller's old refresh token burned with no new one
    // returned to them.
    @PostMapping("/refresh")
    @Transactional
    public ApiResponse<LoginResponse> refresh(@Valid @RequestBody AuthDtos.RefreshRequest request) {
        RefreshToken refreshToken = refreshTokenService.rotate(request.refreshToken());
        User user = refreshToken.getUser();
        return ApiResponse.ok(buildSessionResponse(user, refreshToken.getToken()));
    }

    /**
     * Called after a login/refresh returned {@code needsProjectSelection=true} (or to switch
     * projects mid-session), once the user has picked which of their Projects to enter.
     */
    @PostMapping("/select-project")
    @Transactional
    public ApiResponse<LoginResponse> selectProject(@Valid @RequestBody AuthDtos.SelectProjectRequest request) {
        RefreshToken refreshToken = refreshTokenService.rotate(request.refreshToken());
        User user = refreshToken.getUser();
        boolean isMember = projectResolutionService.activeProjects(user.getId()).stream()
            .anyMatch(rp -> rp.project().getId().equals(request.projectId()));
        if (!isMember) {
            throw new IllegalArgumentException("You are not a member of that project");
        }
        user.setCurrentProjectId(request.projectId());
        userRepository.save(user);
        return ApiResponse.ok(buildSessionResponse(user, refreshToken.getToken()));
    }

    @GetMapping("/my-projects")
    public ApiResponse<List<ProjectDtos.MyProjectSummary>> myProjects() {
        User user = authenticatedUserService.currentUser();
        return ApiResponse.ok(projectResolutionService.activeProjects(user.getId()).stream()
            .map(projectResolutionService::toSummary).toList());
    }

    /**
     * Super Admin never has a project. Everyone else: exactly one active Project auto-selects
     * (today's default-workspace-backfilled case for every existing user — fully backward
     * compatible); more than one prefers whichever Project the user last selected if still valid,
     * otherwise returns {@code needsProjectSelection=true} so the shell can show a picker.
     */
    private LoginResponse buildSessionResponse(User user, String refreshTokenValue) {
        if (user.getRole() == UserRole.SUPER_ADMIN) {
            return LoginResponse.simple(jwtService.createAccessToken(user), refreshTokenValue, UserProfileDto.from(user));
        }
        List<ProjectResolutionService.ResolvedProject> projects = projectResolutionService.activeProjects(user.getId());
        if (projects.isEmpty()) {
            throw new IllegalArgumentException(projectResolutionService.hasAnySuspendedMembership(user.getId())
                ? "Your workspace has been suspended. Contact your administrator."
                : "Your account is not assigned to any workspace. Contact your administrator.");
        }
        if (projects.size() == 1) {
            return withProjectResponse(user, refreshTokenValue, projects.get(0));
        }
        Optional<ProjectResolutionService.ResolvedProject> preferred = user.getCurrentProjectId() == null
            ? Optional.empty()
            : projects.stream().filter(rp -> rp.project().getId().equals(user.getCurrentProjectId())).findFirst();
        if (preferred.isPresent()) {
            return withProjectResponse(user, refreshTokenValue, preferred.get());
        }
        List<ProjectDtos.MyProjectSummary> summaries = projects.stream().map(projectResolutionService::toSummary).toList();
        return LoginResponse.pendingSelection(jwtService.createAccessToken(user), refreshTokenValue, UserProfileDto.from(user), summaries);
    }

    private LoginResponse withProjectResponse(User user, String refreshTokenValue, ProjectResolutionService.ResolvedProject resolved) {
        user.setCurrentProjectId(resolved.project().getId());
        userRepository.save(user);
        String token = jwtService.createProjectAccessToken(user, projectResolutionService.toContext(resolved));
        return LoginResponse.withProject(token, refreshTokenValue, UserProfileDto.from(user), projectResolutionService.toSummary(resolved));
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
        otpService.send(user.getUsername(), user.getEmail(), OtpPurpose.FORGOT_PASSWORD);
        auditService.record(user, AuditAction.OTP_SENT, "Forgot password OTP sent", servletRequest);
        return ApiResponse.ok(Map.of("status", "otp_sent"));
    }

    @PostMapping("/reset-password")
    public ApiResponse<Map<String, String>> resetPassword(@Valid @RequestBody AuthDtos.ResetPasswordRequest request, HttpServletRequest servletRequest) {
        validatePassword(request.newPassword());
        otpService.verify(request.email(), request.otp(), OtpPurpose.FORGOT_PASSWORD);
        User user = userRepository.findByEmail(request.email()).orElseThrow();
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        auditService.record(user, AuditAction.PASSWORD_RESET, "Password reset completed", servletRequest);
        notifyPasswordChanged(user);
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
        notifyPasswordChanged(user);
        return ApiResponse.ok(Map.of("status", "password_changed"));
    }

    @GetMapping("/google/login-url")
    public ApiResponse<Map<String, String>> googleLoginUrl() {
        return ApiResponse.ok(Map.of(
            "loginUrl", "/oauth2/authorization/google",
            "note", "Configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable Google OAuth2 login"
        ));
    }

    // A password-change mail hiccup must never undo (or fail to report) a password that has
    // already been changed — same swallow-and-continue pattern as WorkspaceProvisioningService's
    // approval email.
    private void notifyPasswordChanged(User user) {
        try {
            mailService.sendPasswordChanged(user.getEmail(), user.getUsername());
        } catch (RuntimeException ex) {
            log.warn("password-changed notification failed for {}: {}", user.getUsername(), ex.getMessage());
        }
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
