package com.automationportal.auth;

import com.automationportal.users.User;
import com.automationportal.users.UserRepository;
import com.automationportal.users.UserStatus;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
        throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        String token = null;
        if (header != null && header.startsWith("Bearer ")) {
            token = header.substring(7);
        } else if (request.getRequestURI().startsWith(request.getContextPath() + "/api/events/execution/")) {
            // The one legitimate use: EventSource (SSE) can't set request headers, so the
            // live execution log stream passes its token as ?token=... instead. Every other
            // endpoint requires the Authorization header — a query-param token elsewhere would
            // otherwise leak into browser history, proxy logs, and access logs on every request.
            token = request.getParameter("token");
        }
        if (token != null) {
            try {
                String username = jwtService.username(token);
                User user = userRepository.findByUsername(username).orElse(null);
                if (user != null && user.getStatus() == UserStatus.ACTIVE && user.isEmailVerified()) {
                    var auth = new UsernamePasswordAuthenticationToken(
                        user,
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
                    );
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            } catch (JwtException | IllegalArgumentException ignored) {
                SecurityContextHolder.clearContext();
            }
        }
        filterChain.doFilter(request, response);
    }
}
