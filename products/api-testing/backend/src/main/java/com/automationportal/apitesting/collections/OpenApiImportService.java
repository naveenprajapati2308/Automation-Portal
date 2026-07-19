package com.automationportal.apitesting.collections;

import com.automationportal.apitesting.execution.dto.AuthConfig;
import com.automationportal.apitesting.execution.dto.ExecutionRequest;
import com.automationportal.apitesting.execution.dto.KeyValueItem;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Imports an OpenAPI 3.x (JSON or YAML) or Swagger 2.0 spec into an
 * ApiCollection — one CollectionRequest per operation. Path params are left
 * as {param} in the URL for the user to fill in before running (this
 * platform's tester has no path-templating engine, unlike the dynamic
 * Regular API side).
 */
@Service
@RequiredArgsConstructor
public class OpenApiImportService {

    private static final Set<String> HTTP_METHODS = Set.of("get", "post", "put", "patch", "delete", "options", "head");

    private final ApiCollectionRepository collectionRepository;
    private final CollectionRequestRepository requestRepository;
    private final CollectionFolderRepository folderRepository;
    private final ObjectMapper objectMapper;
    private final YAMLMapper yamlMapper = new YAMLMapper();

    public PostmanImportService.ImportResult importSpec(String specText) {
        JsonNode root = parse(specText);
        if (root.path("paths").isMissingNode()) {
            throw new IllegalArgumentException("Not an OpenAPI/Swagger spec (missing 'paths') — export as OpenAPI 3.x or Swagger 2.0 JSON/YAML");
        }

        String title = root.path("info").path("title").asText("Imported API Spec");
        String baseUrl = resolveBaseUrl(root);

        ApiCollection collection = new ApiCollection();
        collection.setName(title);
        collection.setDescription("Imported from OpenAPI/Swagger spec");
        collection = collectionRepository.save(collection);
        final Long collectionId = collection.getId();

        List<String> warnings = new ArrayList<>();
        List<CollectionRequest> out = new ArrayList<>();
        // Each unique first-tag becomes a folder — most real-world specs tag
        // every operation (e.g. "Users", "Orders"), so this gives imported
        // OpenAPI collections the same folder structure Postman imports get.
        Map<String, Long> tagFolders = new HashMap<>();

        JsonNode paths = root.path("paths");
        paths.fieldNames().forEachRemaining(path -> {
            JsonNode pathItem = paths.path(path);
            List<JsonNode> sharedParams = toList(pathItem.path("parameters"));
            pathItem.fieldNames().forEachRemaining(method -> {
                if (!HTTP_METHODS.contains(method.toLowerCase())) return;
                JsonNode op = pathItem.path(method);
                try {
                    CollectionRequest cr = convertOperation(collectionId, baseUrl, path, method.toUpperCase(), op, sharedParams, root);
                    cr.setFolderId(resolveFolderId(collectionId, op, tagFolders));
                    out.add(cr);
                } catch (Exception e) {
                    warnings.add("Skipped " + method.toUpperCase() + " " + path + ": " + e.getMessage());
                }
            });
        });

        for (int i = 0; i < out.size(); i++) out.get(i).setSeq(i);
        requestRepository.saveAll(out);
        return new PostmanImportService.ImportResult(collection, out.size(), warnings);
    }

    private JsonNode parse(String text) {
        String trimmed = text.strip();
        try {
            if (trimmed.startsWith("{")) {
                return objectMapper.readTree(trimmed);
            }
            return yamlMapper.readTree(trimmed);
        } catch (Exception e) {
            throw new IllegalArgumentException("Could not parse as JSON or YAML: " + e.getMessage());
        }
    }

    private String resolveBaseUrl(JsonNode root) {
        // OpenAPI 3.x: servers[0].url ; Swagger 2.0: schemes[0] + host + basePath
        JsonNode servers = root.path("servers");
        if (servers.isArray() && servers.size() > 0) {
            String url = servers.get(0).path("url").asText("");
            if (!url.isBlank()) return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
        }
        String host = root.path("host").asText("");
        if (!host.isBlank()) {
            String scheme = root.path("schemes").isArray() && root.path("schemes").size() > 0
                    ? root.path("schemes").get(0).asText("https") : "https";
            String basePath = root.path("basePath").asText("");
            return scheme + "://" + host + basePath;
        }
        return "";
    }

    private CollectionRequest convertOperation(Long collectionId, String baseUrl, String path, String method,
                                              JsonNode op, List<JsonNode> sharedParams, JsonNode root) throws Exception {
        String name = op.path("summary").asText(op.path("operationId").asText(method + " " + path));

        ExecutionRequest config = new ExecutionRequest();
        config.setMethod(method);
        config.setUrl(baseUrl + path);

        List<KeyValueItem> queryParams = new ArrayList<>();
        List<KeyValueItem> headers = new ArrayList<>();

        List<JsonNode> allParams = new ArrayList<>(sharedParams);
        allParams.addAll(toList(op.path("parameters")));
        for (JsonNode p : allParams) {
            String in = p.path("in").asText("");
            String key = p.path("name").asText("");
            if (key.isBlank()) continue;
            String example = firstNonBlank(
                    p.path("example").asText(""),
                    p.path("schema").path("example").asText(""),
                    p.path("schema").path("default").asText(""));
            boolean required = p.path("required").asBoolean(false);
            if ("query".equals(in)) {
                queryParams.add(new KeyValueItem(key, example, required));
            } else if ("header".equals(in)) {
                headers.add(new KeyValueItem(key, example, required));
            }
            // "path" params stay as {param} in the URL; "cookie" params are rare enough to skip.
        }
        config.setQueryParams(queryParams);
        config.setHeaders(headers);

        // Request body (OpenAPI 3.x) or Swagger 2.0 body/formData parameter
        JsonNode content = op.path("requestBody").path("content").path("application/json");
        if (!content.isMissingNode()) {
            JsonNode example = content.path("example");
            if (example.isMissingNode()) example = content.path("examples");
            String bodyText = !example.isMissingNode() && !example.isEmpty()
                    ? objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(example)
                    : schemaStub(content.path("schema"));
            config.setBodyType(ExecutionRequest.BodyType.JSON);
            config.setBody(bodyText);
        } else {
            for (JsonNode p : allParams) {
                if ("body".equals(p.path("in").asText(""))) {
                    config.setBodyType(ExecutionRequest.BodyType.JSON);
                    config.setBody(schemaStub(p.path("schema")));
                }
            }
        }
        if (config.getBodyType() == null) config.setBodyType(ExecutionRequest.BodyType.NONE);

        config.setAuth(resolveAuth(op, root));

        CollectionRequest cr = new CollectionRequest();
        cr.setCollectionId(collectionId);
        cr.setName(name.length() > 200 ? name.substring(0, 200) : name);
        cr.setMethod(method);
        String url = config.getUrl();
        cr.setUrl(url.length() > 2048 ? url.substring(0, 2048) : url);
        cr.setConfigJson(objectMapper.writeValueAsString(config));
        return cr;
    }

    /** Best-effort placeholder body from a JSON schema — just enough to show the expected shape. */
    private String schemaStub(JsonNode schema) {
        if (schema == null || schema.isMissingNode()) return "";
        try {
            var stub = objectMapper.createObjectNode();
            if ("object".equals(schema.path("type").asText(""))) {
                schema.path("properties").fieldNames().forEachRemaining(f -> stub.putNull(f));
                return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(stub);
            }
            return "{}";
        } catch (Exception e) {
            return "{}";
        }
    }

    private AuthConfig resolveAuth(JsonNode op, JsonNode root) {
        AuthConfig auth = new AuthConfig();
        JsonNode security = op.path("security");
        if (security.isMissingNode() || !security.isArray() || security.isEmpty()) {
            security = root.path("security");
        }
        if (!security.isArray() || security.isEmpty()) return auth;

        String schemeName = security.get(0).fieldNames().hasNext() ? security.get(0).fieldNames().next() : null;
        if (schemeName == null) return auth;

        JsonNode scheme = root.path("components").path("securitySchemes").path(schemeName);
        if (scheme.isMissingNode()) scheme = root.path("securityDefinitions").path(schemeName); // Swagger 2.0

        String type = scheme.path("type").asText("");
        String schemeAttr = scheme.path("scheme").asText("");
        if ("http".equals(type) && "bearer".equalsIgnoreCase(schemeAttr)) {
            auth.setType(AuthConfig.Type.BEARER);
            auth.setToken("");
        } else if ("http".equals(type) && "basic".equalsIgnoreCase(schemeAttr)) {
            auth.setType(AuthConfig.Type.BASIC);
        } else if ("apiKey".equals(type)) {
            auth.setType(AuthConfig.Type.API_KEY);
            auth.setKeyName(scheme.path("name").asText(""));
            auth.setAddTo("query".equalsIgnoreCase(scheme.path("in").asText(""))
                    ? AuthConfig.ApiKeyLocation.QUERY : AuthConfig.ApiKeyLocation.HEADER);
        }
        return auth;
    }

    /** Maps an operation's first "tags" entry to a folder, creating it on first use. */
    private Long resolveFolderId(Long collectionId, JsonNode op, Map<String, Long> tagFolders) {
        JsonNode tags = op.path("tags");
        if (!tags.isArray() || tags.isEmpty()) return null;
        String tag = tags.get(0).asText("");
        if (tag.isBlank()) return null;
        return tagFolders.computeIfAbsent(tag, t -> {
            CollectionFolder f = new CollectionFolder();
            f.setCollectionId(collectionId);
            f.setName(t.length() > 150 ? t.substring(0, 150) : t);
            f.setSeq(tagFolders.size());
            return folderRepository.save(f).getId();
        });
    }

    private List<JsonNode> toList(JsonNode arr) {
        List<JsonNode> list = new ArrayList<>();
        if (arr.isArray()) arr.forEach(list::add);
        return list;
    }

    private String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) return v;
        }
        return "";
    }
}
