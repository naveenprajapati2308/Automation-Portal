package com.automationportal.apitesting.collections;

import com.automationportal.apitesting.execution.dto.AuthConfig;
import com.automationportal.apitesting.execution.dto.ExecutionRequest;
import com.automationportal.apitesting.execution.dto.KeyValueItem;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Imports a Postman Collection (v2.x JSON) into an ApiCollection. Nested
 * "item" arrays become real CollectionFolder records (preserving the actual
 * folder tree, not a flattened name); request-level auth (basic/bearer/
 * apikey), headers, query params and raw/urlencoded bodies are mapped onto the
 * platform's ExecutionRequest config.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PostmanImportService {

    private final ApiCollectionRepository collectionRepository;
    private final CollectionRequestRepository requestRepository;
    private final CollectionFolderRepository folderRepository;
    private final CollectionVariableResolver variableResolver;
    private final ObjectMapper objectMapper;

    public record ImportResult(ApiCollection collection, int importedRequests, List<String> warnings) { }

    public ImportResult importPostman(String json) {
        JsonNode root;
        try {
            root = objectMapper.readTree(json);
        } catch (Exception e) {
            throw new IllegalArgumentException("Not valid JSON: " + e.getMessage());
        }
        JsonNode info = root.path("info");
        if (info.isMissingNode() || root.path("item").isMissingNode()) {
            throw new IllegalArgumentException("Not a Postman collection (missing info/item) — export as Collection v2.1 JSON");
        }

        ApiCollection collection = new ApiCollection();
        collection.setName(info.path("name").asText("Imported Collection"));
        collection.setDescription("Imported from Postman");
        collection.setVariables(extractVariables(root));
        collection = collectionRepository.save(collection);

        List<String> warnings = new ArrayList<>();
        List<CollectionRequest> out = new ArrayList<>();
        walkItems(root.path("item"), collection.getId(), null, out, warnings);

        for (int i = 0; i < out.size(); i++) {
            out.get(i).setSeq(i);
        }
        requestRepository.saveAll(out);
        return new ImportResult(collection, out.size(), warnings);
    }

    /**
     * Folders are saved immediately (not batched) so their generated id is
     * available as the parentFolderId for nested items in the same pass.
     */
    private void walkItems(JsonNode items, Long collectionId, Long parentFolderId,
                           List<CollectionRequest> out, List<String> warnings) {
        if (!items.isArray()) return;
        int seq = 0;
        for (JsonNode item : items) {
            String name = item.path("name").asText("Unnamed");
            if (item.has("item")) {
                CollectionFolder folder = new CollectionFolder();
                folder.setCollectionId(collectionId);
                folder.setParentFolderId(parentFolderId);
                folder.setName(name.length() > 150 ? name.substring(0, 150) : name);
                folder.setSeq(seq++);
                folder = folderRepository.save(folder);
                walkItems(item.path("item"), collectionId, folder.getId(), out, warnings);
            } else if (item.has("request")) {
                try {
                    CollectionRequest cr = convert(item, name, collectionId);
                    cr.setFolderId(parentFolderId);
                    out.add(cr);
                } catch (Exception e) {
                    warnings.add("Skipped '" + name + "': " + e.getMessage());
                }
            }
        }
    }

    private CollectionRequest convert(JsonNode item, String name, Long collectionId) throws Exception {
        JsonNode req = item.path("request");

        ExecutionRequest config = new ExecutionRequest();
        config.setMethod(req.path("method").asText("GET").toUpperCase());

        // URL: string or structured object
        JsonNode urlNode = req.path("url");
        String rawUrl = urlNode.isTextual() ? urlNode.asText() : urlNode.path("raw").asText("");
        if (rawUrl.isBlank()) throw new IllegalArgumentException("no URL");
        // Strip existing query — captured separately below so it stays editable
        String baseUrl = rawUrl.contains("?") ? rawUrl.substring(0, rawUrl.indexOf('?')) : rawUrl;
        config.setUrl(baseUrl);

        // Query params
        List<KeyValueItem> params = new ArrayList<>();
        for (JsonNode q : urlNode.path("query")) {
            params.add(new KeyValueItem(q.path("key").asText(""), q.path("value").asText(""),
                    !q.path("disabled").asBoolean(false)));
        }
        config.setQueryParams(params);

        // Headers
        List<KeyValueItem> headers = new ArrayList<>();
        for (JsonNode h : req.path("header")) {
            headers.add(new KeyValueItem(h.path("key").asText(""), h.path("value").asText(""),
                    !h.path("disabled").asBoolean(false)));
        }
        config.setHeaders(headers);

        // Body
        JsonNode body = req.path("body");
        String mode = body.path("mode").asText("");
        switch (mode) {
            case "raw" -> {
                config.setBody(body.path("raw").asText(""));
                String lang = body.path("options").path("raw").path("language").asText("json");
                config.setBodyType(switch (lang) {
                    case "xml" -> ExecutionRequest.BodyType.XML;
                    case "html" -> ExecutionRequest.BodyType.HTML;
                    case "text" -> ExecutionRequest.BodyType.TEXT;
                    default -> ExecutionRequest.BodyType.JSON;
                });
            }
            case "urlencoded" -> {
                StringBuilder sb = new StringBuilder();
                for (JsonNode kv : body.path("urlencoded")) {
                    if (kv.path("disabled").asBoolean(false)) continue;
                    if (sb.length() > 0) sb.append('&');
                    sb.append(kv.path("key").asText("")).append('=').append(kv.path("value").asText(""));
                }
                config.setBody(sb.toString());
                config.setBodyType(ExecutionRequest.BodyType.FORM_URLENCODED);
            }
            default -> config.setBodyType(ExecutionRequest.BodyType.NONE);
        }

        // Auth (request-level)
        JsonNode auth = req.path("auth");
        AuthConfig ac = new AuthConfig();
        switch (auth.path("type").asText("")) {
            case "basic" -> {
                ac.setType(AuthConfig.Type.BASIC);
                ac.setUsername(postmanAuthValue(auth.path("basic"), "username"));
                ac.setPassword(postmanAuthValue(auth.path("basic"), "password"));
            }
            case "bearer" -> {
                ac.setType(AuthConfig.Type.BEARER);
                ac.setToken(postmanAuthValue(auth.path("bearer"), "token"));
            }
            case "apikey" -> {
                ac.setType(AuthConfig.Type.API_KEY);
                ac.setKeyName(postmanAuthValue(auth.path("apikey"), "key"));
                ac.setKeyValue(postmanAuthValue(auth.path("apikey"), "value"));
                ac.setAddTo("query".equalsIgnoreCase(postmanAuthValue(auth.path("apikey"), "in"))
                        ? AuthConfig.ApiKeyLocation.QUERY : AuthConfig.ApiKeyLocation.HEADER);
            }
            default -> ac.setType(AuthConfig.Type.NONE);
        }
        config.setAuth(ac);

        CollectionRequest cr = new CollectionRequest();
        cr.setCollectionId(collectionId);
        cr.setName(name.length() > 200 ? name.substring(0, 200) : name);
        cr.setMethod(config.getMethod());
        cr.setUrl(baseUrl.length() > 2048 ? baseUrl.substring(0, 2048) : baseUrl);
        cr.setConfigJson(objectMapper.writeValueAsString(config));
        return cr;
    }

    /** Postman auth entries are [{key,value,type}] arrays. */
    private String postmanAuthValue(JsonNode arr, String key) {
        if (arr.isArray()) {
            for (JsonNode e : arr) {
                if (key.equals(e.path("key").asText())) return e.path("value").asText("");
            }
        }
        return "";
    }

    /**
     * Captures Postman's collection-level "variable" array (e.g. {{baseUrl}})
     * so imported requests that reference them aren't left with a literal,
     * unresolvable {{placeholder}} in their URL.
     */
    private String extractVariables(JsonNode root) {
        JsonNode variables = root.path("variable");
        List<KeyValueItem> out = new ArrayList<>();
        if (variables.isArray()) {
            for (JsonNode v : variables) {
                String key = v.path("key").asText("");
                if (key.isBlank()) continue;
                out.add(new KeyValueItem(key, v.path("value").asText(""), true));
            }
        }
        return variableResolver.toJson(out);
    }
}
