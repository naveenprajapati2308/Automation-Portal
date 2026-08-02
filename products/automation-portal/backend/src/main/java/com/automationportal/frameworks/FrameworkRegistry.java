package com.automationportal.frameworks;

import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Single source of truth for which frameworks the portal knows how to run, and what each one
 * can do. Deliberately hardcoded rather than DB-backed: each descriptor here ships in the same
 * change as the runXyz() method in FrameworkRunnerService it describes, so a descriptor can
 * never claim a capability (e.g. video) the runner doesn't actually implement yet. Adding a
 * future framework (Cypress, Appium, REST Assured, JMeter, k6) means registering one more
 * descriptor here plus its runXyz() counterpart — nothing else in the portal needs to change.
 */
@Component
public class FrameworkRegistry {
    private final Map<String, FrameworkDescriptor> descriptors = new LinkedHashMap<>();

    public FrameworkRegistry() {
        register(new FrameworkDescriptor(
                "MAVEN_TESTNG",
                "Selenium (Maven / TestNG)",
                Set.of(FrameworkDescriptor.CAP_SCREENSHOTS, FrameworkDescriptor.CAP_LOGS),
                // Browser is baked into the external Maven/TestNG suite's own code today —
                // not a portal-selectable parameter, so the "Select Browser" step is skipped.
                java.util.List.of()
        ));
        register(new FrameworkDescriptor(
                "PLAYWRIGHT",
                "Playwright",
                Set.of(FrameworkDescriptor.CAP_SCREENSHOTS, FrameworkDescriptor.CAP_VIDEO,
                        FrameworkDescriptor.CAP_LOGS, FrameworkDescriptor.CAP_TRACE),
                // Only "chrome" is an active project in playwright.config.ts today (reusing the
                // Chrome already installed for Selenium); firefox/webkit are commented out there
                // and their binaries aren't installed in the runner image, so they're left out
                // here until both are actually wired up.
                java.util.List.of("chrome")
        ));
    }

    private void register(FrameworkDescriptor descriptor) {
        descriptors.put(descriptor.code(), descriptor);
    }

    public Collection<FrameworkDescriptor> list() {
        return descriptors.values();
    }

    public Optional<FrameworkDescriptor> find(String code) {
        return Optional.ofNullable(descriptors.get(code));
    }
}
