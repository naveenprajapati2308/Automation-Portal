package com.automationportal.profile;

import com.automationportal.audit.*;
import com.automationportal.auth.*;
import com.automationportal.common.ApiResponse;
import com.automationportal.common.ImageSniffer;
import com.automationportal.users.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {
    private final AuthenticatedUserService authenticatedUserService;
    private final UserRepository userRepository;
    private final OtpService otpService;
    private final AuditService auditService;
    private final AuditLogRepository auditLogRepository;

    @Value("${portal.uploads.profiles-dir:artifacts/profiles}")
    private String profilesDir;

    public ProfileController(AuthenticatedUserService authenticatedUserService, UserRepository userRepository,
                             OtpService otpService, AuditService auditService, AuditLogRepository auditLogRepository) {
        this.authenticatedUserService = authenticatedUserService;
        this.userRepository = userRepository;
        this.otpService = otpService;
        this.auditService = auditService;
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping
    public ApiResponse<UserProfileDto> profile() {
        return ApiResponse.ok(UserProfileDto.from(authenticatedUserService.currentUser()));
    }

    @PutMapping
    public ApiResponse<UserProfileDto> update(@RequestBody ProfileDtos.UpdateProfileRequest request, HttpServletRequest servletRequest) {
        User user = authenticatedUserService.currentUser();
        if (request.fullName() != null && !request.fullName().isBlank()) user.setDisplayName(request.fullName());
        if (request.mobileNumber() != null) user.setMobileNumber(request.mobileNumber());
        if (request.designation() != null) user.setDesignation(request.designation());
        if (request.organization() != null) user.setOrganization(request.organization());
        if (request.profileImagePath() != null) user.setProfileImagePath(request.profileImagePath());
        userRepository.save(user);
        auditService.record(user, AuditAction.PROFILE_UPDATE, "Profile updated", servletRequest);
        return ApiResponse.ok(UserProfileDto.from(user));
    }

    @PostMapping("/image")
    public ApiResponse<Map<String, String>> uploadProfileImage(@RequestParam("file") MultipartFile file,
                                                               HttpServletRequest servletRequest) throws IOException {
        // Never trust the client-supplied Content-Type or filename extension — both are
        // attacker-controlled (a spoofed "image/png" header on an .html/.svg payload is a
        // stored-XSS path once served back from /uploads/profiles/). Sniff the real magic
        // bytes and derive a fixed, safe extension from what the file actually is.
        String extension = ImageSniffer.sniffExtension(file);
        if (extension == null) {
            throw new IllegalArgumentException("Only PNG, JPEG, GIF, or WEBP image files are allowed");
        }
        String filename = UUID.randomUUID() + extension;

        // Resolve to an absolute path: MultipartFile.transferTo() resolves relative paths
        // against Tomcat's temp work directory, not the application working directory.
        Path dir = Paths.get(profilesDir).toAbsolutePath();
        Files.createDirectories(dir);
        Path target = dir.resolve(filename);
        Files.copy(file.getInputStream(), target);

        String urlPath = "/uploads/profiles/" + filename;

        User user = authenticatedUserService.currentUser();
        user.setProfileImagePath(urlPath);
        userRepository.save(user);
        auditService.record(user, AuditAction.PROFILE_UPDATE, "Profile image updated", servletRequest);
        return ApiResponse.ok(Map.of("profileImagePath", urlPath));
    }

    @PostMapping("/email-change/request")
    public ApiResponse<Map<String, String>> requestEmailChange(@Valid @RequestBody AuthDtos.EmailChangeRequest request, HttpServletRequest servletRequest) {
        if (userRepository.existsByEmail(request.newEmail())) {
            throw new IllegalArgumentException("Email already exists");
        }
        User user = authenticatedUserService.currentUser();
        if (usesEmailAsUsername(user) && userRepository.existsByUsername(request.newEmail())) {
            throw new IllegalArgumentException("Email already exists");
        }
        user.setPendingEmail(request.newEmail());
        userRepository.save(user);
        // Not returned in the response: the whole point of this OTP is proving the user
        // actually controls the new address, which an API-response shortcut would defeat.
        otpService.send(user.getUsername(), request.newEmail(), OtpPurpose.EMAIL_CHANGE);
        auditService.record(user, AuditAction.OTP_SENT, "Email change OTP sent", servletRequest);
        return ApiResponse.ok(Map.of("status", "otp_sent"));
    }

    @PostMapping("/email-change/verify")
    public ApiResponse<UserProfileDto> verifyEmailChange(@Valid @RequestBody AuthDtos.EmailChangeVerifyRequest request, HttpServletRequest servletRequest) {
        User user = authenticatedUserService.currentUser();
        if (!request.newEmail().equals(user.getPendingEmail())) {
            throw new IllegalArgumentException("Email change request not found");
        }
        otpService.verify(request.newEmail(), request.otp(), OtpPurpose.EMAIL_CHANGE);
        if (usesEmailAsUsername(user)) {
            user.setUsername(request.newEmail());
        }
        user.setEmail(request.newEmail());
        user.setPendingEmail(null);
        user.setEmailVerified(true);
        userRepository.save(user);
        auditService.record(user, AuditAction.EMAIL_CHANGE, "Email changed", servletRequest);
        return ApiResponse.ok(UserProfileDto.from(user));
    }

    /**
     * Login accepts either the username or email column, and self-service accounts are
     * created with username == email. If we only ever updated email on a change, the old
     * address would keep authenticating forever via the stale username (this caused a
     * crash-loop bug where the seeder tried to recreate a "vacated" address). Only sync
     * when the username still mirrors the email, so admin-assigned custom usernames aren't
     * silently overwritten.
     */
    private boolean usesEmailAsUsername(User user) {
        return user.getEmail() != null && user.getEmail().equalsIgnoreCase(user.getUsername());
    }

    @GetMapping("/audit-logs")
    public ApiResponse<List<AuditLogDto>> auditLogs() {
        User user = authenticatedUserService.currentUser();
        return ApiResponse.ok(auditLogRepository.findTop50ByUserOrderByCreatedAtDesc(user).stream().map(AuditLogDto::from).toList());
    }
}

