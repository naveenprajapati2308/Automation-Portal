package com.automationportal.auth;

import com.automationportal.audit.AuditAction;
import com.automationportal.audit.AuditService;
import com.automationportal.users.*;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.UUID;

@Component
public class GoogleOAuth2SuccessHandler implements AuthenticationSuccessHandler {
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final AuditService auditService;
    private final String frontendUrl;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public GoogleOAuth2SuccessHandler(UserRepository userRepository,
                                      JwtService jwtService, RefreshTokenService refreshTokenService,
                                      AuditService auditService,
                                      @Value("${portal.app.frontend-url}") String frontendUrl) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.auditService = auditService;
        this.frontendUrl = frontendUrl;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication)
        throws IOException, ServletException {
        OAuth2User principal = (OAuth2User) authentication.getPrincipal();
        String email = principal.getAttribute("email");
        String name = principal.getAttribute("name");
        if (email == null || email.isBlank()) {
            throw new ServletException("Google account did not provide an email address");
        }
        User user = userRepository.findByEmail(email).orElseGet(() -> {
            User created = new User();
            created.setUsername(email.substring(0, email.indexOf('@')).replaceAll("[^A-Za-z0-9_]", "") + "_" + UUID.randomUUID().toString().substring(0, 6));
            created.setEmail(email);
            created.setDisplayName(name != null ? name : email);
            created.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
            created.setRole(UserRole.VIEWER);
            created.setStatus(UserStatus.ACTIVE);
            created.setEmailVerified(true);
            created.setAuthProvider("GOOGLE");
            return userRepository.save(created);
        });
        refreshTokenService.revokeActiveTokensFor(user);
        RefreshToken refreshToken = refreshTokenService.create(user, true);
        auditService.record(user, AuditAction.LOGIN, "Google OAuth2 login", request);
        String redirect = UriComponentsBuilder.fromUriString(frontendUrl)
            .fragment("accessToken=" + jwtService.createAccessToken(user) + "&refreshToken=" + refreshToken.getToken())
            .build()
            .toUriString();
        response.sendRedirect(redirect);
    }
}
