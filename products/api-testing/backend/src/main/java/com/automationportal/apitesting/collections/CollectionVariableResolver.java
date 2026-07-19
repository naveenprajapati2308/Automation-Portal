package com.automationportal.apitesting.collections;

import com.automationportal.apitesting.execution.dto.ExecutionRequest;
import com.automationportal.apitesting.execution.dto.KeyValueItem;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Resolves Postman-style {{variable}} placeholders in a Collection Request
 * against its collection's variables (the flat key-value list Postman calls
 * "collection variables") — no dependency graph, unlike the Regular API side's
 * DependencyExecutionService; just a straight substitution pass.
 */
@Component
@RequiredArgsConstructor
public class CollectionVariableResolver {

    private static final Pattern PLACEHOLDER = Pattern.compile("\\{\\{\\s*([a-zA-Z0-9_.-]+)\\s*}}");

    private final ObjectMapper objectMapper;

    public List<KeyValueItem> parseVariables(String variablesJson) {
        if (variablesJson == null || variablesJson.isBlank()) return new ArrayList<>();
        try {
            return objectMapper.readValue(variablesJson, new TypeReference<List<KeyValueItem>>() { });
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    public String toJson(List<KeyValueItem> variables) {
        try {
            return objectMapper.writeValueAsString(variables);
        } catch (Exception e) {
            return "[]";
        }
    }

    /**
     * Merges two variable lists, keyed by name — entries in {@code overlay}
     * replace same-named entries in {@code base} entirely (used for an active
     * environment overriding collection-level variables, mirroring Postman's
     * environment > collection precedence).
     */
    public List<KeyValueItem> merge(List<KeyValueItem> base, List<KeyValueItem> overlay) {
        Map<String, KeyValueItem> merged = new LinkedHashMap<>();
        for (KeyValueItem v : base) {
            if (v.getKey() != null && !v.getKey().isBlank()) merged.put(v.getKey(), v);
        }
        for (KeyValueItem v : overlay) {
            if (v.getKey() != null && !v.getKey().isBlank()) merged.put(v.getKey(), v);
        }
        return new ArrayList<>(merged.values());
    }

    /** Substitutes {{key}} everywhere in the request (URL, headers, params, body, auth) in place. */
    public void resolve(ExecutionRequest request, List<KeyValueItem> variables) {
        Map<String, String> vars = new LinkedHashMap<>();
        for (KeyValueItem v : variables) {
            if (v.isEnabled() && v.getKey() != null && !v.getKey().isBlank()) {
                vars.put(v.getKey(), v.getValue() == null ? "" : v.getValue());
            }
        }
        if (vars.isEmpty()) return;

        request.setUrl(substitute(request.getUrl(), vars));
        request.setBody(substitute(request.getBody(), vars));
        for (KeyValueItem h : request.getHeaders()) {
            h.setKey(substitute(h.getKey(), vars));
            h.setValue(substitute(h.getValue(), vars));
        }
        for (KeyValueItem q : request.getQueryParams()) {
            q.setKey(substitute(q.getKey(), vars));
            q.setValue(substitute(q.getValue(), vars));
        }
        var auth = request.getAuth();
        if (auth != null) {
            auth.setToken(substitute(auth.getToken(), vars));
            auth.setUsername(substitute(auth.getUsername(), vars));
            auth.setPassword(substitute(auth.getPassword(), vars));
            auth.setKeyValue(substitute(auth.getKeyValue(), vars));
        }
    }

    /** First still-unresolved {{placeholder}} anywhere in the request, or null if none. */
    public String firstUnresolvedPlaceholder(ExecutionRequest request) {
        List<String> all = new ArrayList<>();
        all.add(request.getUrl());
        all.add(request.getBody());
        request.getHeaders().forEach(h -> { all.add(h.getKey()); all.add(h.getValue()); });
        request.getQueryParams().forEach(q -> { all.add(q.getKey()); all.add(q.getValue()); });
        if (request.getAuth() != null) {
            all.add(request.getAuth().getToken());
            all.add(request.getAuth().getUsername());
            all.add(request.getAuth().getPassword());
            all.add(request.getAuth().getKeyValue());
        }
        for (String s : all) {
            if (s == null) continue;
            Matcher m = PLACEHOLDER.matcher(s);
            if (m.find()) return m.group(1);
        }
        return null;
    }

    private String substitute(String template, Map<String, String> vars) {
        if (template == null || template.isEmpty()) return template;
        Matcher m = PLACEHOLDER.matcher(template);
        StringBuilder sb = new StringBuilder();
        while (m.find()) {
            String replacement = vars.get(m.group(1));
            m.appendReplacement(sb, Matcher.quoteReplacement(replacement != null ? replacement : m.group(0)));
        }
        m.appendTail(sb);
        return sb.toString();
    }
}
