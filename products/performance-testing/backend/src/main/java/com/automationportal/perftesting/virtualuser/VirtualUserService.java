package com.automationportal.perftesting.virtualuser;

import com.automationportal.perftesting.common.ApiException;
import com.automationportal.perftesting.common.KeyValue;
import com.automationportal.perftesting.common.Variable;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VirtualUserService {

    private final VirtualUserRepository repository;

    @Transactional(readOnly = true)
    public List<VirtualUserDto> getAll() {
        return repository.findAll().stream()
                .map(VirtualUserDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public VirtualUserDto getById(Long id) {
        VirtualUser entity = repository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Virtual User not found with ID: " + id));
        return VirtualUserDto.fromEntity(entity);
    }

    @Transactional
    public VirtualUserDto create(VirtualUserDto dto) {
        VirtualUser entity = VirtualUser.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .authType(dto.getAuthType())
                .authValue(dto.getAuthValue())
                .authKeyName(dto.getAuthKeyName())
                .authKeyIn(dto.getAuthKeyIn())
                .headers(dto.getHeaders() != null ? dto.getHeaders() : new ArrayList<>())
                .queryParams(dto.getQueryParams() != null ? dto.getQueryParams() : new ArrayList<>())
                .bodyTemplate(dto.getBodyTemplate())
                .variables(dto.getVariables() != null ? dto.getVariables() : new ArrayList<>())
                .build();

        return VirtualUserDto.fromEntity(repository.save(entity));
    }

    @Transactional
    public VirtualUserDto update(Long id, VirtualUserDto dto) {
        VirtualUser existing = repository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Virtual User not found with ID: " + id));

        existing.setName(dto.getName());
        existing.setDescription(dto.getDescription());
        existing.setAuthType(dto.getAuthType());
        existing.setAuthKeyName(dto.getAuthKeyName());
        existing.setAuthKeyIn(dto.getAuthKeyIn());
        existing.setHeaders(dto.getHeaders() != null ? dto.getHeaders() : new ArrayList<>());
        existing.setQueryParams(dto.getQueryParams() != null ? dto.getQueryParams() : new ArrayList<>());
        existing.setBodyTemplate(dto.getBodyTemplate());

        // Update auth value only if it is not sent as masked placeholder
        if (dto.getAuthValue() != null && !isMaskedPlaceholder(dto.getAuthValue())) {
            existing.setAuthValue(dto.getAuthValue());
        } else if (dto.getAuthType() == AuthType.NONE) {
            existing.setAuthValue(null);
        }

        // Merge variables to prevent overwriting masked ones with placeholder values
        if (dto.getVariables() != null) {
            List<Variable> merged = mergeVariables(existing.getVariables(), dto.getVariables());
            existing.setVariables(merged);
        } else {
            existing.setVariables(new ArrayList<>());
        }

        return VirtualUserDto.fromEntity(repository.save(existing));
    }

    @Transactional
    public void delete(Long id) {
        VirtualUser existing = repository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Virtual User not found with ID: " + id));
        // In the future, check if it's referenced in any active load tests before deleting.
        repository.delete(existing);
    }

    @Transactional
    public VirtualUserDto clone(Long id) {
        VirtualUser existing = repository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Virtual User not found with ID: " + id));

        VirtualUser clone = VirtualUser.builder()
                .name(existing.getName() + " (Copy)")
                .description(existing.getDescription())
                .authType(existing.getAuthType())
                .authValue(existing.getAuthValue())
                .authKeyName(existing.getAuthKeyName())
                .authKeyIn(existing.getAuthKeyIn())
                .headers(new ArrayList<>(existing.getHeaders()))
                .queryParams(new ArrayList<>(existing.getQueryParams()))
                .bodyTemplate(existing.getBodyTemplate())
                .variables(new ArrayList<>(existing.getVariables()))
                .build();

        return VirtualUserDto.fromEntity(repository.save(clone));
    }

    @Transactional
    public List<VirtualUserDto> importCsv(java.io.InputStream inputStream) {
        List<VirtualUser> imported = new ArrayList<>();
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        
        try (java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.InputStreamReader(inputStream, java.nio.charset.StandardCharsets.UTF_8))) {
            String headerLine = reader.readLine();
            if (headerLine == null) {
                throw ApiException.badRequest("CSV file is empty");
            }
            List<String> headers = parseCsvLine(headerLine);
            Map<String, Integer> colMap = new HashMap<>();
            for (int i = 0; i < headers.size(); i++) {
                colMap.put(headers.get(i).toLowerCase().trim(), i);
            }
            
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.trim().isEmpty()) continue;
                List<String> values = parseCsvLine(line);
                
                String name = getVal(values, colMap, "name");
                if (name == null || name.isBlank()) {
                    continue; // Skip lines without a name
                }
                
                String description = getVal(values, colMap, "description");
                String authTypeStr = getVal(values, colMap, "authtype");
                AuthType authType = AuthType.NONE;
                if (authTypeStr != null && !authTypeStr.isBlank()) {
                    try {
                        authType = AuthType.valueOf(authTypeStr.toUpperCase().trim());
                    } catch (Exception ignored) {}
                }
                
                String authValue = getVal(values, colMap, "authvalue");
                String authKeyName = getVal(values, colMap, "authkeyname");
                String authKeyInStr = getVal(values, colMap, "authkeyin");
                AuthKeyIn authKeyIn = null;
                if (authKeyInStr != null && !authKeyInStr.isBlank()) {
                    try {
                        authKeyIn = AuthKeyIn.valueOf(authKeyInStr.toUpperCase().trim());
                    } catch (Exception ignored) {}
                }
                
                String headersJson = getVal(values, colMap, "headers");
                List<KeyValue> headersList = new ArrayList<>();
                if (headersJson != null && !headersJson.isBlank()) {
                    try {
                        headersList = mapper.readValue(headersJson, new com.fasterxml.jackson.core.type.TypeReference<List<KeyValue>>() {});
                    } catch (Exception e) {
                        headersList = parseKeyValueFallback(headersJson);
                    }
                }
                
                String queryParamsJson = getVal(values, colMap, "queryparams");
                List<KeyValue> queryParamsList = new ArrayList<>();
                if (queryParamsJson != null && !queryParamsJson.isBlank()) {
                    try {
                        queryParamsList = mapper.readValue(queryParamsJson, new com.fasterxml.jackson.core.type.TypeReference<List<KeyValue>>() {});
                    } catch (Exception e) {
                        queryParamsList = parseKeyValueFallback(queryParamsJson);
                    }
                }
                
                String bodyTemplate = getVal(values, colMap, "bodytemplate");
                
                String variablesJson = getVal(values, colMap, "variables");
                List<Variable> variablesList = new ArrayList<>();
                if (variablesJson != null && !variablesJson.isBlank()) {
                    try {
                        variablesList = mapper.readValue(variablesJson, new com.fasterxml.jackson.core.type.TypeReference<List<Variable>>() {});
                    } catch (Exception e) {
                        variablesList = parseVariablesFallback(variablesJson);
                    }
                }
                
                VirtualUser vu = VirtualUser.builder()
                        .name(name)
                        .description(description)
                        .authType(authType)
                        .authValue(authValue)
                        .authKeyName(authKeyName)
                        .authKeyIn(authKeyIn)
                        .headers(headersList)
                        .queryParams(queryParamsList)
                        .bodyTemplate(bodyTemplate)
                        .variables(variablesList)
                        .build();
                
                imported.add(vu);
            }
        } catch (IOException e) {
            throw ApiException.internal("Error reading CSV stream: " + e.getMessage());
        }
        
        if (imported.isEmpty()) {
            throw ApiException.badRequest("No valid virtual users found in the CSV");
        }
        
        List<VirtualUser> saved = repository.saveAll(imported);
        return saved.stream()
                .map(VirtualUserDto::fromEntity)
                .collect(Collectors.toList());
    }
    
    private String getVal(List<String> values, Map<String, Integer> colMap, String colName) {
        Integer index = colMap.get(colName);
        if (index == null || index >= values.size()) return null;
        return values.get(index);
    }
    
    private List<KeyValue> parseKeyValueFallback(String val) {
        List<KeyValue> list = new ArrayList<>();
        if (val == null || val.isBlank()) return list;
        String[] pairs = val.split("[,;]");
        for (String pair : pairs) {
            String[] kv = pair.split("[=:]", 2);
            if (kv.length == 2) {
                list.add(new KeyValue(kv[0].trim(), kv[1].trim()));
            }
        }
        return list;
    }
    
    private List<Variable> parseVariablesFallback(String val) {
        List<Variable> list = new ArrayList<>();
        if (val == null || val.isBlank()) return list;
        String[] pairs = val.split("[,;]");
        for (String pair : pairs) {
            String[] kv = pair.split("[=:]", 2);
            if (kv.length == 2) {
                list.add(new Variable(kv[0].trim(), kv[1].trim(), false));
            }
        }
        return list;
    }

    public static List<String> parseCsvLine(String line) {
        List<String> values = new ArrayList<>();
        if (line == null || line.isBlank()) return values;
        StringBuilder curVal = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char ch = line.charAt(i);
            if (inQuotes) {
                if (ch == '\"') {
                    if (i + 1 < line.length() && line.charAt(i + 1) == '\"') {
                        curVal.append('\"');
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    curVal.append(ch);
                }
            } else {
                if (ch == '\"') {
                    inQuotes = true;
                } else if (ch == ',') {
                    values.add(curVal.toString().trim());
                    curVal.setLength(0);
                } else {
                    curVal.append(ch);
                }
            }
        }
        values.add(curVal.toString().trim());
        return values;
    }

    private boolean isMaskedPlaceholder(String value) {
        return value.endsWith("...***") || value.equals("********");
    }

    private List<Variable> mergeVariables(List<Variable> oldVars, List<Variable> newVars) {
        Map<String, Variable> oldMap = new HashMap<>();
        if (oldVars != null) {
            for (Variable v : oldVars) {
                oldMap.put(v.key(), v);
            }
        }

        List<Variable> result = new ArrayList<>();
        for (Variable nv : newVars) {
            if (nv.masked() && isMaskedPlaceholder(nv.value())) {
                Variable ov = oldMap.get(nv.key());
                if (ov != null) {
                    result.add(new Variable(nv.key(), ov.value(), true));
                } else {
                    result.add(nv);
                }
            } else {
                result.add(nv);
            }
        }
        return result;
    }
}
