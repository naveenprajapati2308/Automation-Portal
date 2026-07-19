package com.automationportal.apitesting.execution;

import com.automationportal.apitesting.execution.dto.AuthConfig;
import com.automationportal.apitesting.execution.dto.ExecutionRequest;
import com.automationportal.apitesting.execution.dto.ExecutionResponse;
import com.automationportal.apitesting.execution.dto.KeyValueItem;
import io.netty.handler.ssl.SslContextBuilder;
import io.netty.handler.ssl.util.InsecureTrustManagerFactory;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;
import reactor.netty.http.client.HttpClient;

import javax.net.ssl.SSLException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Executes user-built HTTP requests server-side, exactly like curl or Python
 * requests would: no browser, therefore no CORS. This is the architectural
 * heart of the platform.
 */
@Slf4j
@Service
public class ExecutionEngineService {

    /** Hard ceiling so one request can never pin a worker thread indefinitely. */
    private static final long MAX_TIMEOUT_MS = 120_000;
    private static final long MIN_TIMEOUT_MS = 100;

    public ExecutionResponse execute(ExecutionRequest request) {
        request.setTimeoutMs(Math.max(MIN_TIMEOUT_MS, Math.min(request.getTimeoutMs(), MAX_TIMEOUT_MS)));

        // Scheme guard: this platform executes arbitrary user URLs by design
        // (its core feature), but only over HTTP(S). Reject file://, gopher://,
        // ftp:// etc. so a request config can never read local files or reach
        // non-HTTP internal services.
        String schemeError = validateScheme(request.getUrl());
        if (schemeError != null) {
            return ExecutionResponse.builder()
                    .success(false).errorMessage(schemeError).durationMs(0).build();
        }

        long start = System.currentTimeMillis();
        // Time-to-first-byte: captured when response headers arrive, before the
        // body is read. Best-effort per spec; finer DNS/connect splits are not
        // exposed by WebClient without per-request Netty instrumentation.
        java.util.concurrent.atomic.AtomicLong ttfbAt = new java.util.concurrent.atomic.AtomicLong(-1);
        try {
            WebClient client = buildClient(request);
            String finalUrl = buildUrl(request);

            WebClient.RequestBodySpec spec = client
                    .method(HttpMethod.valueOf(request.getMethod().toUpperCase()))
                    .uri(finalUrl)
                    .headers(h -> applyHeaders(h, request));

            if (hasBody(request)) {
                spec.contentType(resolveContentType(request));
                spec.bodyValue(request.getBody());
            }

            ResponseEntity<byte[]> entity = spec
                    .exchangeToMono(resp -> {
                        ttfbAt.set(System.currentTimeMillis());
                        return resp.toEntity(byte[].class);
                    })
                    .block(Duration.ofMillis(request.getTimeoutMs() + 5_000));

            long duration = System.currentTimeMillis() - start;
            byte[] bodyBytes = entity.getBody() == null ? new byte[0] : entity.getBody();

            Map<String, List<String>> headers = new LinkedHashMap<>();
            entity.getHeaders().forEach(headers::put);

            return ExecutionResponse.builder()
                    .success(true)
                    .statusCode(entity.getStatusCode().value())
                    .statusText(statusText(entity.getStatusCode().value()))
                    .headers(headers)
                    .contentType(entity.getHeaders().getFirst(HttpHeaders.CONTENT_TYPE))
                    .body(new String(bodyBytes, StandardCharsets.UTF_8))
                    .durationMs(duration)
                    .ttfbMs(ttfbAt.get() > 0 ? ttfbAt.get() - start : null)
                    .sizeBytes(bodyBytes.length)
                    .build();

        } catch (Exception ex) {
            long duration = System.currentTimeMillis() - start;
            String msg = rootMessage(ex);
            boolean timedOut = ex instanceof io.netty.handler.timeout.ReadTimeoutException
                    || (msg != null && msg.toLowerCase().contains("timeout"));
            log.warn("Execution failed for {} {}: {}", request.getMethod(), request.getUrl(), msg);
            return ExecutionResponse.builder()
                    .success(false)
                    .errorMessage(msg)
                    .durationMs(duration)
                    .timedOut(timedOut)
                    .build();
        }
    }

    private WebClient buildClient(ExecutionRequest request) throws SSLException {
        HttpClient httpClient = HttpClient.create()
                .responseTimeout(Duration.ofMillis(request.getTimeoutMs()))
                .followRedirect(request.isFollowRedirects());

        if (!request.isVerifySsl()) {
            var sslContext = SslContextBuilder.forClient()
                    .trustManager(InsecureTrustManagerFactory.INSTANCE)
                    .build();
            httpClient = httpClient.secure(t -> t.sslContext(sslContext));
        }

        return WebClient.builder()
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                // Users may test APIs returning large payloads; 16MB cap.
                .codecs(c -> c.defaultCodecs().maxInMemorySize(16 * 1024 * 1024))
                .build();
    }

    private String validateScheme(String url) {
        if (url == null || url.isBlank()) return "URL is required";
        String lower = url.trim().toLowerCase();
        if (!lower.startsWith("http://") && !lower.startsWith("https://")) {
            return "Only http:// and https:// URLs may be executed";
        }
        return null;
    }

    private String buildUrl(ExecutionRequest request) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(request.getUrl().trim());
        for (KeyValueItem p : request.getQueryParams()) {
            if (p.isEnabled() && p.getKey() != null && !p.getKey().isBlank()) {
                builder.queryParam(p.getKey(), p.getValue() == null ? "" : p.getValue());
            }
        }
        AuthConfig auth = request.getAuth();
        if (auth != null && auth.getType() == AuthConfig.Type.API_KEY
                && auth.getAddTo() == AuthConfig.ApiKeyLocation.QUERY
                && auth.getKeyName() != null && !auth.getKeyName().isBlank()) {
            builder.queryParam(auth.getKeyName(), auth.getKeyValue());
        }
        return builder.build().toUriString();
    }

    private void applyHeaders(HttpHeaders target, ExecutionRequest request) {
        for (KeyValueItem h : request.getHeaders()) {
            if (h.isEnabled() && h.getKey() != null && !h.getKey().isBlank()) {
                target.add(h.getKey(), h.getValue() == null ? "" : h.getValue());
            }
        }
        AuthConfig auth = request.getAuth();
        if (auth == null) {
            return;
        }
        switch (auth.getType()) {
            case BASIC -> {
                String creds = (auth.getUsername() == null ? "" : auth.getUsername())
                        + ":" + (auth.getPassword() == null ? "" : auth.getPassword());
                target.set(HttpHeaders.AUTHORIZATION,
                        "Basic " + Base64.getEncoder().encodeToString(creds.getBytes(StandardCharsets.UTF_8)));
            }
            case BEARER -> target.set(HttpHeaders.AUTHORIZATION, "Bearer " + (auth.getToken() == null ? "" : auth.getToken()));
            case API_KEY -> {
                if (auth.getAddTo() == AuthConfig.ApiKeyLocation.HEADER
                        && auth.getKeyName() != null && !auth.getKeyName().isBlank()) {
                    target.set(auth.getKeyName(), auth.getKeyValue());
                }
            }
            case NONE -> { /* nothing */ }
        }
    }

    private boolean hasBody(ExecutionRequest request) {
        return request.getBodyType() != ExecutionRequest.BodyType.NONE
                && request.getBody() != null
                && !request.getBody().isEmpty();
    }

    private MediaType resolveContentType(ExecutionRequest request) {
        return switch (request.getBodyType()) {
            case JSON -> MediaType.APPLICATION_JSON;
            case XML -> MediaType.APPLICATION_XML;
            case HTML -> MediaType.TEXT_HTML;
            case FORM_URLENCODED -> MediaType.APPLICATION_FORM_URLENCODED;
            default -> MediaType.TEXT_PLAIN;
        };
    }

    private String rootMessage(Throwable ex) {
        Throwable root = ex;
        while (root.getCause() != null && root.getCause() != root) {
            root = root.getCause();
        }
        String msg = root.getMessage();
        return (msg == null || msg.isBlank()) ? root.getClass().getSimpleName() : msg;
    }

    private String statusText(int code) {
        try {
            return org.springframework.http.HttpStatus.valueOf(code).getReasonPhrase();
        } catch (IllegalArgumentException e) {
            return "";
        }
    }
}
