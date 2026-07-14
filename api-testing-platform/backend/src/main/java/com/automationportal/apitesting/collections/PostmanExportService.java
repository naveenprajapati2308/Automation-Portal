package com.automationportal.apitesting.collections;

import com.automationportal.apitesting.execution.dto.AuthConfig;
import com.automationportal.apitesting.execution.dto.ExecutionRequest;
import com.automationportal.apitesting.execution.dto.KeyValueItem;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Exports a platform collection (including its folder tree and variables) as
 * a Postman Collection v2.1 JSON document (importable back into Postman/
 * Hoppscotch/Bruno/Insomnia) or as the platform's own native JSON.
 */
@Service
@RequiredArgsConstructor
public class PostmanExportService {

    private final ObjectMapper objectMapper;
    private final CollectionVariableResolver variableResolver;

    public String toNativeJson(ApiCollection collection, List<CollectionFolder> folders, List<CollectionRequest> requests) {
        ObjectNode root = objectMapper.createObjectNode();
        root.put("name", collection.getName());
        root.put("description", collection.getDescription());
        root.set("variables", objectMapper.valueToTree(variableResolver.parseVariables(collection.getVariables())));

        ArrayNode folderArr = root.putArray("folders");
        for (CollectionFolder f : folders) {
            ObjectNode fn = folderArr.addObject();
            fn.put("id", f.getId());
            fn.put("parentFolderId", f.getParentFolderId());
            fn.put("name", f.getName());
        }

        ArrayNode items = root.putArray("requests");
        for (CollectionRequest r : requests) {
            ObjectNode item = items.addObject();
            item.put("name", r.getName());
            item.put("folderId", r.getFolderId());
            item.set("config", objectMapper.valueToTree(readConfig(r)));
        }
        return writeJson(root);
    }

    public String toPostmanCollection(ApiCollection collection, List<CollectionFolder> folders, List<CollectionRequest> requests) {
        ObjectNode root = objectMapper.createObjectNode();
        ObjectNode info = root.putObject("info");
        info.put("_postman_id", UUID.randomUUID().toString());
        info.put("name", collection.getName());
        info.put("description", collection.getDescription() == null ? "" : collection.getDescription());
        info.put("schema", "https://schema.getpostman.com/json/collection/v2.1.0/collection.json");

        Map<Long, List<CollectionFolder>> foldersByParent = groupBy(folders, CollectionFolder::getParentFolderId);
        Map<Long, List<CollectionRequest>> requestsByFolder = groupBy(requests, CollectionRequest::getFolderId);

        ArrayNode items = root.putArray("item");
        buildItems(items, null, foldersByParent, requestsByFolder);

        ArrayNode variables = root.putArray("variable");
        for (KeyValueItem v : variableResolver.parseVariables(collection.getVariables())) {
            ObjectNode vn = variables.addObject();
            vn.put("key", v.getKey());
            vn.put("value", v.getValue());
        }
        return writeJson(root);
    }

    /** Recursively rebuilds the folder tree as nested Postman "item" groups. */
    private void buildItems(ArrayNode target, Long parentFolderId,
                           Map<Long, List<CollectionFolder>> foldersByParent,
                           Map<Long, List<CollectionRequest>> requestsByFolder) {
        for (CollectionFolder folder : foldersByParent.getOrDefault(parentFolderId, List.of())) {
            ObjectNode folderNode = target.addObject();
            folderNode.put("name", folder.getName());
            ArrayNode subItems = folderNode.putArray("item");
            buildItems(subItems, folder.getId(), foldersByParent, requestsByFolder);
        }
        for (CollectionRequest r : requestsByFolder.getOrDefault(parentFolderId, List.of())) {
            target.add(toPostmanItem(r.getName(), readConfig(r)));
        }
    }

    private <T, K> Map<K, List<T>> groupBy(List<T> list, java.util.function.Function<T, K> keyFn) {
        Map<K, List<T>> map = new HashMap<>();
        for (T item : list) {
            map.computeIfAbsent(keyFn.apply(item), k -> new java.util.ArrayList<>()).add(item);
        }
        return map;
    }

    private ObjectNode toPostmanItem(String name, ExecutionRequest cfg) {
        ObjectNode item = objectMapper.createObjectNode();
        item.put("name", name);
        ObjectNode request = item.putObject("request");
        request.put("method", cfg.getMethod());

        ArrayNode headerArr = request.putArray("header");
        for (KeyValueItem h : nullSafe(cfg.getHeaders())) {
            ObjectNode hn = headerArr.addObject();
            hn.put("key", h.getKey());
            hn.put("value", h.getValue());
            hn.put("disabled", !h.isEnabled());
        }

        ObjectNode urlNode = request.putObject("url");
        urlNode.put("raw", cfg.getUrl());
        ArrayNode queryArr = urlNode.putArray("query");
        for (KeyValueItem q : nullSafe(cfg.getQueryParams())) {
            ObjectNode qn = queryArr.addObject();
            qn.put("key", q.getKey());
            qn.put("value", q.getValue());
            qn.put("disabled", !q.isEnabled());
        }

        if (cfg.getBodyType() != null && cfg.getBodyType() != ExecutionRequest.BodyType.NONE
                && cfg.getBody() != null && !cfg.getBody().isEmpty()) {
            ObjectNode body = request.putObject("body");
            if (cfg.getBodyType() == ExecutionRequest.BodyType.FORM_URLENCODED) {
                body.put("mode", "urlencoded");
                ArrayNode urlencoded = body.putArray("urlencoded");
                for (String pair : cfg.getBody().split("&")) {
                    if (pair.isBlank()) continue;
                    String[] kv = pair.split("=", 2);
                    ObjectNode kvn = urlencoded.addObject();
                    kvn.put("key", kv[0]);
                    kvn.put("value", kv.length > 1 ? kv[1] : "");
                }
            } else {
                body.put("mode", "raw");
                body.put("raw", cfg.getBody());
                ObjectNode options = body.putObject("options");
                ObjectNode raw = options.putObject("raw");
                raw.put("language", switch (cfg.getBodyType()) {
                    case XML -> "xml";
                    case HTML -> "html";
                    case TEXT -> "text";
                    default -> "json";
                });
            }
        }

        AuthConfig auth = cfg.getAuth();
        if (auth != null && auth.getType() != AuthConfig.Type.NONE) {
            ObjectNode authNode = request.putObject("auth");
            switch (auth.getType()) {
                case BASIC -> {
                    authNode.put("type", "basic");
                    ArrayNode basic = authNode.putArray("basic");
                    addKv(basic, "username", auth.getUsername());
                    addKv(basic, "password", auth.getPassword());
                }
                case BEARER -> {
                    authNode.put("type", "bearer");
                    ArrayNode bearer = authNode.putArray("bearer");
                    addKv(bearer, "token", auth.getToken());
                }
                case API_KEY -> {
                    authNode.put("type", "apikey");
                    ArrayNode apikey = authNode.putArray("apikey");
                    addKv(apikey, "key", auth.getKeyName());
                    addKv(apikey, "value", auth.getKeyValue());
                    addKv(apikey, "in", auth.getAddTo() == AuthConfig.ApiKeyLocation.QUERY ? "query" : "header");
                }
                default -> { }
            }
        }
        return item;
    }

    private void addKv(ArrayNode arr, String key, String value) {
        ObjectNode n = arr.addObject();
        n.put("key", key);
        n.put("value", value == null ? "" : value);
        n.put("type", "string");
    }

    private ExecutionRequest readConfig(CollectionRequest r) {
        try {
            return objectMapper.readValue(r.getConfigJson(), ExecutionRequest.class);
        } catch (Exception e) {
            throw new IllegalStateException("Corrupt stored config for request " + r.getId(), e);
        }
    }

    private <T> List<T> nullSafe(List<T> list) {
        return list == null ? List.of() : list;
    }

    private String writeJson(ObjectNode root) {
        try {
            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(root);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to serialize export", e);
        }
    }
}
