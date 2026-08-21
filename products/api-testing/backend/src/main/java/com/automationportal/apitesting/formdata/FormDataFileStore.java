package com.automationportal.apitesting.formdata;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

/**
 * Raw-bytes local-filesystem store for uploaded form-data files (volume-mounted
 * in Docker, same shape as the history body store — see LocalGzipBodyStore).
 * Bytes are stored once, on upload, and referenced by id from then on so a
 * scheduled (unattended) execution can multipart-upload the same file without
 * a browser present to re-supply it.
 */
@Slf4j
@Component
public class FormDataFileStore {

    private final Path root;

    public FormDataFileStore(@Value("${apitesting.formdata.store-dir}") String dir) throws IOException {
        this.root = Path.of(dir);
        Files.createDirectories(root);
    }

    public String store(byte[] bytes) {
        String id = UUID.randomUUID().toString();
        try {
            Files.write(resolve(id), bytes);
            return id;
        } catch (IOException e) {
            log.error("Failed to store form-data file: {}", e.getMessage());
            throw new IllegalStateException("Failed to store uploaded file", e);
        }
    }

    public byte[] load(String fileId) {
        try {
            Path file = resolve(fileId);
            if (!Files.exists(file)) return null;
            return Files.readAllBytes(file);
        } catch (IOException e) {
            log.warn("Failed to load form-data file {}: {}", fileId, e.getMessage());
            return null;
        }
    }

    public void delete(String fileId) {
        try {
            Files.deleteIfExists(resolve(fileId));
        } catch (IOException e) {
            log.warn("Failed to delete form-data file {}: {}", fileId, e.getMessage());
        }
    }

    private Path resolve(String fileId) {
        // fileId is always a UUID we generated ourselves, but normalize and confine to
        // root anyway so a corrupt/forged id can never escape it (path traversal).
        Path p = root.resolve(fileId).normalize();
        if (!p.startsWith(root.normalize())) {
            throw new IllegalArgumentException("Invalid file id");
        }
        return p;
    }
}
