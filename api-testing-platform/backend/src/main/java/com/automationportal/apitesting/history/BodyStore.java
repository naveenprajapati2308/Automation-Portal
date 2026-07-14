package com.automationportal.apitesting.history;

/**
 * Storage for oversized response bodies. Object-store-shaped (key based) so a
 * MinIO/S3 implementation can replace the local one without touching callers.
 */
public interface BodyStore {

    /** Stores the body gzip-compressed; returns the object key. */
    String store(long executionId, byte[] body);

    /** Returns the decompressed body, or null if missing. */
    String load(String objectKey);

    void delete(String objectKey);
}
