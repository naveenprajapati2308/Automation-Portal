package com.automationportal.apitesting.security;

import java.util.List;

/** Tenant/Project/role context resolved from the current request's JWT claims (mirrors
 * automation-portal's own ProjectContext — same claim shape, separate copy since this is a
 * different Spring Boot service). */
public record ProjectContext(Long tenantId, Long projectId, String projectCode, List<String> projectRoles) {
    public boolean hasRole(String roleCode) {
        return projectRoles != null && projectRoles.contains(roleCode);
    }
}
