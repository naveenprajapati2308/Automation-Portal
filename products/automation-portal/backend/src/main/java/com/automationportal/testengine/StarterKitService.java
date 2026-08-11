package com.automationportal.testengine;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * Assembles a downloadable "starter kit" — a minimal, working reference project (Selenium/TestNG
 * or Playwright) already wired to Testrix's event-push contract — with the workspace's own portal
 * URL, API key, framework path, and report path filled into its config file. Templates live under
 * classpath:starter-kits/{selenium,playwright}/ (implements the contract documented in the
 * "Documentation" page's "Writing Your Framework's Integration Code" section, sourced from
 * docs/test-engine-integration-architecture.md and FrameworkRunnerService.java's actual reserved
 * -D flags).
 */
@Service
public class StarterKitService {
    private static final List<String> SELENIUM_FILES = List.of(
        "pom.xml",
        "testng.xml",
        "README.md",
        "config-v2.properties",
        "src/main/java/testrix/ConfigUtils.java",
        "src/main/java/testrix/PortalApiClient.java",
        "src/main/java/testrix/TestrixListener.java",
        "src/test/java/tests/SampleTest.java"
    );

    private static final List<String> PLAYWRIGHT_FILES = List.of(
        "package.json",
        "playwright.config.ts",
        "README.md",
        ".env",
        "tests/example.spec.ts",
        "tests/reporter/testrix-reporter.ts"
    );

    /** Files that get {{PLACEHOLDER}} substitution; everything else is copied byte-for-byte. */
    private static final Set<String> TEMPLATED_FILES = Set.of("config-v2.properties", ".env", "README.md");

    public byte[] build(EngineType engineType, Map<String, String> placeholderValues) throws IOException {
        boolean playwright = engineType == EngineType.PLAYWRIGHT;
        String root = playwright ? "starter-kits/playwright/" : "starter-kits/selenium/";
        List<String> files = playwright ? PLAYWRIGHT_FILES : SELENIUM_FILES;

        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(buffer)) {
            for (String relativePath : files) {
                byte[] content = readResource(root + relativePath);
                String filenameOnly = relativePath.substring(relativePath.lastIndexOf('/') + 1);
                if (TEMPLATED_FILES.contains(filenameOnly)) {
                    content = applyPlaceholders(new String(content, StandardCharsets.UTF_8), placeholderValues)
                        .getBytes(StandardCharsets.UTF_8);
                }
                zip.putNextEntry(new ZipEntry(relativePath));
                zip.write(content);
                zip.closeEntry();
            }
        }
        return buffer.toByteArray();
    }

    private byte[] readResource(String classpathLocation) throws IOException {
        try (InputStream in = new ClassPathResource(classpathLocation).getInputStream()) {
            return in.readAllBytes();
        }
    }

    private String applyPlaceholders(String template, Map<String, String> values) {
        String result = template;
        for (var entry : values.entrySet()) {
            result = result.replace("{{" + entry.getKey() + "}}", entry.getValue() == null ? "" : entry.getValue());
        }
        return result;
    }
}
