package com.automationportal.apitesting.security;

import org.springframework.stereotype.Service;

/** Email of the user making the current request, resolved from the JWT's "email" claim
 * (via {@link ProjectContextHolder}). Null when there's no project context (e.g. a background
 * schedule-worker thread with no inbound request). */
@Service
public class CurrentUserService {
    public String currentEmail() {
        ProjectContext context = ProjectContextHolder.get();
        return context == null ? null : context.email();
    }
}
