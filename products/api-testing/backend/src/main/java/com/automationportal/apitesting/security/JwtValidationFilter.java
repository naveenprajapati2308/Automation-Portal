package com.automationportal.apitesting.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.crypto.SecretKey;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Set;

/**
 * This service never issues its own tokens — it only validates the signature and expiry of
 * tokens automation-portal already issued at login, using the same shared HMAC secret. There's
 * no local user table here, so there's nothing to look up beyond "is this a validly-signed,
 * non-expired token" (mirrors automation-portal's JwtAuthenticationFilter, minus the DB lookup).
 * Also extracts the tenant/project/role claims automation-portal's Phase 1 work added, into
 * {@link ProjectContextHolder} — the seam every project-scoped controller reads from.
 */
@Slf4j
@Component
public class JwtValidationFilter extends OncePerRequestFilter {
    private final SecretKey key;

    public JwtValidationFilter(@Value("${security.jwt.secret}") String secret) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
                var auth = new UsernamePasswordAuthenticationToken(claims.getSubject(), null, List.of());
                SecurityContextHolder.getContext().setAuthentication(auth);
                ProjectContextHolder.set(projectContextFrom(claims));
            } catch (JwtException | IllegalArgumentException ex) {
                SecurityContextHolder.clearContext();
            }
        }
        try {
            if (isViewerOnlyMutation(request, ProjectContextHolder.get())) {
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.setContentType("application/json");
                response.getWriter().write("{\"success\":false,\"message\":\"Viewer role is read-only\",\"data\":null}");
                return;
            }
            chain.doFilter(request, response);
        } finally {
            ProjectContextHolder.clear();
        }
    }

    private static final Set<String> MUTATING_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");
    private static final Set<String> VIEWER_EXEMPT_PREFIXES = Set.of("/api/auth", "/api/profile");

    // docs/version2.2.md: Viewer is strictly read-only, enforced here at the one point every
    // project-scoped request already passes through, rather than duplicated per-controller.
    private boolean isViewerOnlyMutation(HttpServletRequest request, ProjectContext context) {
        if (context == null || context.projectRoles() == null || context.projectRoles().isEmpty()) return false;
        if (!MUTATING_METHODS.contains(request.getMethod())) return false;
        String path = request.getRequestURI().substring(request.getContextPath().length());
        for (String prefix : VIEWER_EXEMPT_PREFIXES) {
            if (path.startsWith(prefix)) return false;
        }
        return context.projectRoles().stream().allMatch("VIEWER"::equals);
    }

    @SuppressWarnings("unchecked")
    private ProjectContext projectContextFrom(Claims claims) {
        String projectId = claims.get("projectId", String.class);
        if (projectId == null) return null;
        String tenantId = claims.get("tenantId", String.class);
        String projectCode = claims.get("projectCode", String.class);
        List<String> roles = claims.get("projectRoles", List.class);
        String email = claims.get("email", String.class);
        return new ProjectContext(Long.valueOf(tenantId), Long.valueOf(projectId), projectCode,
                roles == null ? List.of() : roles, email);
    }
}
