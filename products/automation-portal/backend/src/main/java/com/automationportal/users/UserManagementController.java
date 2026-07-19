
package com.automationportal.users;

import com.automationportal.audit.AuditAction;
import com.automationportal.audit.AuditService;
import com.automationportal.common.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Admin-only user management endpoints.
 * All routes under /api/admin/** are restricted to SUPER_ADMIN by SecurityConfig.
 */
@RestController
@RequestMapping("/api/admin/users")
public class UserManagementController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final JdbcTemplate jdbcTemplate;

    public UserManagementController(UserRepository userRepository,
                                    PasswordEncoder passwordEncoder,
                                    AuditService auditService,
                                    JdbcTemplate jdbcTemplate) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
        this.jdbcTemplate = jdbcTemplate;
    }

    /** List all users (paginated result kept simple for now). */
    @GetMapping
    public ApiResponse<List<UserProfileDto>> listUsers() {
        List<UserProfileDto> users = userRepository.findAll()
            .stream()
            .map(UserProfileDto::from)
            .toList();
        return ApiResponse.ok(users);
    }

    /** Get single user detail. */
    @GetMapping("/{id}")
    public ApiResponse<UserProfileDto> getUser(@PathVariable Long id) {
        User user = findUser(id);
        return ApiResponse.ok(UserProfileDto.from(user));
    }

    /** Create a new user — only admins can do this; no self-registration exists. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<UserProfileDto> createUser(@Valid @RequestBody UserManagementDtos.CreateUserRequest request,
                                                  HttpServletRequest servletRequest) {
        if (userRepository.existsByUsername(request.username())) {
            throw new IllegalArgumentException("Username already exists");
        }
        String email = normalizeOptional(request.email());
        if (email != null && userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email already exists");
        }
        validatePassword(request.password());

        User user = new User();
        user.setUsername(request.username());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setDisplayName(request.fullName() != null ? request.fullName() : request.username());
        user.setMobileNumber(request.mobileNumber());
        user.setDesignation(request.designation());
        user.setOrganization(request.organization());
        user.setRole(request.role() != null ? request.role() : UserRole.VIEWER);
        user.setStatus(UserStatus.ACTIVE);
        user.setEmailVerified(true);
        user.setAuthProvider("LOCAL");
        userRepository.save(user);

        auditService.record(user, AuditAction.USER_CREATE, "User created by admin", servletRequest);
        return ApiResponse.created("User created", UserProfileDto.from(user));
    }

    /** Update user info fields. */
    @PutMapping("/{id}")
    public ApiResponse<UserProfileDto> updateUser(@PathVariable Long id,
                                                  @Valid @RequestBody UserManagementDtos.UpdateUserRequest request,
                                                  HttpServletRequest servletRequest) {
        User user = findUser(id);
        user.setDisplayName(request.fullName().trim());
        user.setMobileNumber(request.mobileNumber().trim());
        user.setDesignation(request.designation().trim());
        if (request.organization() != null) user.setOrganization(request.organization());
        userRepository.save(user);
        auditService.record(user, AuditAction.USER_UPDATE, "User updated by admin", servletRequest);
        return ApiResponse.ok(UserProfileDto.from(user));
    }

    /** Disable (deactivate) a user account. */
    @PutMapping("/{id}/disable")
    public ApiResponse<UserProfileDto> disableUser(@PathVariable Long id, HttpServletRequest servletRequest) {
        User user = findUser(id);
        if (user.getRole() == UserRole.SUPER_ADMIN) {
            throw new IllegalArgumentException("Cannot disable the Super Admin account");
        }
        user.setStatus(UserStatus.DISABLED);
        userRepository.save(user);
        auditService.record(user, AuditAction.USER_DISABLE, "User disabled by admin", servletRequest);
        return ApiResponse.ok(UserProfileDto.from(user));
    }

    /** Enable (reactivate) a user account. */
    @PutMapping("/{id}/enable")
    public ApiResponse<UserProfileDto> enableUser(@PathVariable Long id, HttpServletRequest servletRequest) {
        User user = findUser(id);
        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);
        auditService.record(user, AuditAction.USER_ENABLE, "User enabled by admin", servletRequest);
        return ApiResponse.ok(UserProfileDto.from(user));
    }

    /** Force-reset a user's password. */
    @PutMapping("/{id}/reset-password")
    public ApiResponse<UserProfileDto> resetPassword(@PathVariable Long id,
                                                     @Valid @RequestBody UserManagementDtos.ResetPasswordRequest request,
                                                     HttpServletRequest servletRequest) {
        validatePassword(request.newPassword());
        User user = findUser(id);
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        auditService.record(user, AuditAction.USER_PASSWORD_RESET, "Password reset by admin", servletRequest);
        return ApiResponse.ok(UserProfileDto.from(user));
    }

    /** Assign a new role to a user. */
    @PutMapping("/{id}/role")
    public ApiResponse<UserProfileDto> assignRole(@PathVariable Long id,
                                                  @Valid @RequestBody UserManagementDtos.AssignRoleRequest request,
                                                  HttpServletRequest servletRequest) {
        User user = findUser(id);
        if (user.getRole() == UserRole.SUPER_ADMIN && request.role() != UserRole.SUPER_ADMIN) {
            throw new IllegalArgumentException("Cannot change the Super Admin role");
        }
        user.setRole(request.role());
        userRepository.save(user);
        auditService.record(user, AuditAction.ROLE_CHANGE, "Role changed to " + request.role() + " by admin", servletRequest);
        return ApiResponse.ok(UserProfileDto.from(user));
    }

    /** Delete a user permanently. SUPER_ADMIN accounts cannot be deleted. */
    @DeleteMapping("/{id}")
    @Transactional
    public ApiResponse<Void> deleteUser(@PathVariable Long id, HttpServletRequest servletRequest) {
        User user = findUser(id);
        if (user.getRole() == UserRole.SUPER_ADMIN) {
            throw new IllegalArgumentException("Cannot delete the Super Admin account");
        }
        
        // Record audit event first, while the user exists
        auditService.record(user, AuditAction.USER_DELETE, "User deleted by admin", servletRequest);
        
        // Clean up database foreign key constraint references
        jdbcTemplate.update("DELETE FROM user_roles WHERE user_id = ?", id);
        jdbcTemplate.update("DELETE FROM refresh_tokens WHERE user_id = ?", id);
        jdbcTemplate.update("UPDATE audit_logs SET user_id = NULL WHERE user_id = ?", id);
        jdbcTemplate.update("UPDATE executions SET triggered_by = (SELECT MIN(id) FROM users WHERE role = 'SUPER_ADMIN') WHERE triggered_by = ?", id);
        
        // Delete user
        userRepository.deleteById(id);
        
        return ApiResponse.ok(null);
    }

    private User findUser(Long id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private String normalizeOptional(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private void validatePassword(String password) {
        if (password == null || password.length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters");
        }
    }
}
