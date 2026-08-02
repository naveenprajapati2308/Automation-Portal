package com.automationportal.frameworks;

import java.util.List;
import java.util.Set;

/**
 * Describes one automation framework the portal can dispatch to. `capabilities` is a free-form
 * set (not fixed booleans) so a future capability (e.g. HAR capture, performance metrics) is
 * additive, not a shape change. `browsers` reflects only what's actually installed/wired in the
 * framework-runner today — an empty list means the framework's browser is baked into its own
 * test code and isn't a portal-selectable parameter.
 */
public record FrameworkDescriptor(
        String code,
        String displayName,
        Set<String> capabilities,
        List<String> browsers
) {
    public static final String CAP_SCREENSHOTS = "SCREENSHOTS";
    public static final String CAP_VIDEO = "VIDEO";
    public static final String CAP_LOGS = "LOGS";
    public static final String CAP_TRACE = "TRACE";

    public boolean hasCapability(String capability) {
        return capabilities != null && capabilities.contains(capability);
    }
}
