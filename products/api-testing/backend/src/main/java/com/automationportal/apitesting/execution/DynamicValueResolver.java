package com.automationportal.apitesting.execution;

import com.automationportal.apitesting.execution.dto.ExecutionRequest;
import com.automationportal.apitesting.execution.dto.KeyValueItem;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Resolves reserved {{$function}} placeholders (distinct from named
 * {{variable}} bindings — the '$' keeps the two syntaxes from colliding).
 * Each generated value is memoized in the caller-supplied cache, keyed by
 * the literal placeholder text, so every occurrence of e.g. {{$randomMobile}}
 * within the same run (same cache instance, i.e. same ExecutionContext)
 * resolves to the identical value — required when a mobile number used to
 * send an OTP must still match the mobile number used to verify it and to
 * submit registration, later in the same chain.
 */
@Component
public class DynamicValueResolver {

    private static final Pattern PLACEHOLDER = Pattern.compile("\\{\\{\\s*(\\$[a-zA-Z0-9_]+)\\s*}}");
    private static final SecureRandom RANDOM = new SecureRandom();

    public void resolve(ExecutionRequest request, Map<String, String> cache) {
        request.setUrl(substitute(request.getUrl(), cache));
        request.setBody(substitute(request.getBody(), cache));
        for (KeyValueItem h : request.getHeaders()) {
            h.setKey(substitute(h.getKey(), cache));
            h.setValue(substitute(h.getValue(), cache));
        }
        for (KeyValueItem q : request.getQueryParams()) {
            q.setKey(substitute(q.getKey(), cache));
            q.setValue(substitute(q.getValue(), cache));
        }
        var auth = request.getAuth();
        if (auth != null) {
            auth.setToken(substitute(auth.getToken(), cache));
            auth.setUsername(substitute(auth.getUsername(), cache));
            auth.setPassword(substitute(auth.getPassword(), cache));
            auth.setKeyValue(substitute(auth.getKeyValue(), cache));
        }
    }

    private String substitute(String template, Map<String, String> cache) {
        if (template == null || template.isEmpty()) return template;
        Matcher m = PLACEHOLDER.matcher(template);
        StringBuilder sb = new StringBuilder();
        while (m.find()) {
            String token = m.group(1);
            String value = cache.computeIfAbsent(token, this::generate);
            m.appendReplacement(sb, Matcher.quoteReplacement(value));
        }
        m.appendTail(sb);
        return sb.toString();
    }

    private String generate(String token) {
        return switch (token) {
            case "$randomMobile" -> "9" + String.format("%09d", RANDOM.nextInt(1_000_000_000));
            case "$randomEmail" -> "qa." + Long.toHexString(RANDOM.nextLong() & Long.MAX_VALUE) + "@test.local";
            case "$randomInt" -> String.valueOf(RANDOM.nextInt(1_000_000));
            case "$timestamp" -> String.valueOf(System.currentTimeMillis());
            case "$guid" -> UUID.randomUUID().toString();
            default -> "";
        };
    }
}
