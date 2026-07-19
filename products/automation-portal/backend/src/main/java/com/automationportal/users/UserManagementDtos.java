package com.automationportal.users;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public final class UserManagementDtos {
    private UserManagementDtos() {}

    /**
     * Fields: username (required), email (required, valid format),
     * password (required), fullName (required), mobileNumber (required),
     * designation (required), organization (optional), role (required).
     */
    public record CreateUserRequest(
        @NotBlank(message = "Username is required")          String username,
        @NotBlank(message = "Email is required")
        @Email   (message = "Email must be a valid address") String email,
        @NotBlank(message = "Password is required")          String password,
        @NotBlank(message = "Full name is required")          String fullName,
        @NotBlank(message = "Mobile number is required")     String mobileNumber,
        @NotBlank(message = "Designation is required")        String designation,
        String organization,
        @NotNull(message = "Role is required")               UserRole role
    ) {}

    public record UpdateUserRequest(
        @NotBlank(message = "Full name is required")      String fullName,
        @NotBlank(message = "Mobile number is required")  String mobileNumber,
        @NotBlank(message = "Designation is required")    String designation,
        String organization
    ) {}

    public record AssignRoleRequest(@NotNull UserRole role) {}

    public record ResetPasswordRequest(@NotBlank String newPassword) {}
}
