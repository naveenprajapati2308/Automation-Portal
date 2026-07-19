package com.automationportal.apitesting.history;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.zip.GZIPInputStream;
import java.util.zip.GZIPOutputStream;

/**
 * Local-filesystem BodyStore (gzip files under a configurable directory,
 * volume-mounted in Docker). Key format mirrors the object-store convention
 * `api-testing/history/{execution_id}.gz` so a MinIO impl is a drop-in swap.
 */
@Slf4j
@Component
public class LocalGzipBodyStore implements BodyStore {

    private final Path root;

    public LocalGzipBodyStore(@Value("${apitesting.history.body-store-dir}") String dir) throws IOException {
        this.root = Path.of(dir);
        Files.createDirectories(root);
    }

    @Override
    public String store(long executionId, byte[] body) {
        String key = "api-testing/history/" + executionId + ".gz";
        try {
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            try (GZIPOutputStream gz = new GZIPOutputStream(bos)) {
                gz.write(body);
            }
            Path file = resolve(key);
            Files.createDirectories(file.getParent());
            Files.write(file, bos.toByteArray());
            return key;
        } catch (IOException e) {
            log.error("Failed to store response body for execution {}: {}", executionId, e.getMessage());
            return null;
        }
    }

    @Override
    public String load(String objectKey) {
        try {
            Path file = resolve(objectKey);
            if (!Files.exists(file)) return null;
            try (GZIPInputStream gz = new GZIPInputStream(Files.newInputStream(file))) {
                return new String(gz.readAllBytes(), StandardCharsets.UTF_8);
            }
        } catch (IOException e) {
            log.warn("Failed to load body {}: {}", objectKey, e.getMessage());
            return null;
        }
    }

    @Override
    public void delete(String objectKey) {
        try {
            Files.deleteIfExists(resolve(objectKey));
        } catch (IOException e) {
            log.warn("Failed to delete body {}: {}", objectKey, e.getMessage());
        }
    }

    private Path resolve(String key) {
        // Keys are internal ("api-testing/history/{id}.gz"), but normalize and
        // confine to the root anyway so a corrupt key can never escape it.
        Path p = root.resolve(key).normalize();
        if (!p.startsWith(root.normalize())) {
            throw new IllegalArgumentException("Invalid object key: " + key);
        }
        return p;
    }
}
