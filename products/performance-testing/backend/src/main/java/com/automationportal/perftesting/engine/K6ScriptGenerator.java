package com.automationportal.perftesting.engine;

import com.automationportal.perftesting.common.KeyValue;
import com.automationportal.perftesting.loadtest.LoadTest;
import com.automationportal.perftesting.loadtest.Stage;
import com.automationportal.perftesting.loadtest.VuAssignment;
import com.automationportal.perftesting.perftest.PerformanceTest;
import com.automationportal.perftesting.virtualuser.AuthKeyIn;
import com.automationportal.perftesting.virtualuser.AuthType;
import com.automationportal.perftesting.virtualuser.VirtualUser;
import com.automationportal.perftesting.virtualuser.VirtualUserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class K6ScriptGenerator {

    private final VirtualUserRepository virtualUserRepository;
    private static final ObjectMapper mapper = new ObjectMapper();

    public String generatePerformanceTestScript(PerformanceTest test) {
        StringBuilder sb = new StringBuilder();
        sb.append("import http from 'k6/http';\n");
        sb.append("import { check, sleep } from 'k6';\n\n");

        // Options
        sb.append("export const options = {\n");
        sb.append("  scenarios: {\n");
        sb.append("    default: {\n");
        sb.append("      executor: 'shared-iterations',\n");
        sb.append("      vus: 1,\n");
        sb.append("      iterations: ").append(test.getIterations()).append(",\n");
        sb.append("      maxDuration: '30m',\n");
        sb.append("    }\n");
        sb.append("  },\n");

        // Thresholds
        sb.append("  thresholds: {\n");
        List<String> durationThresholds = new ArrayList<>();
        if (test.getThresholdP50Ms() != null) durationThresholds.add("'p(50)<" + test.getThresholdP50Ms() + "'");
        if (test.getThresholdP75Ms() != null) durationThresholds.add("'p(75)<" + test.getThresholdP75Ms() + "'");
        if (test.getThresholdP90Ms() != null) durationThresholds.add("'p(90)<" + test.getThresholdP90Ms() + "'");
        if (test.getThresholdP95Ms() != null) durationThresholds.add("'p(95)<" + test.getThresholdP95Ms() + "'");
        if (test.getThresholdP99Ms() != null) durationThresholds.add("'p(99)<" + test.getThresholdP99Ms() + "'");
        if (test.getThresholdMaxMs() != null) durationThresholds.add("'max<" + test.getThresholdMaxMs() + "'");

        if (!durationThresholds.isEmpty()) {
            sb.append("    'http_req_duration': [").append(String.join(", ", durationThresholds)).append("],\n");
        }
        if (test.getThresholdErrorRatePct() != null) {
            double rate = test.getThresholdErrorRatePct() / 100.0;
            sb.append("    'http_req_failed': ['rate<").append(rate).append("'],\n");
        }
        sb.append("  }\n");
        sb.append("};\n\n");

        // Request details
        sb.append("const url = '").append(escapeJs(test.getTargetUrl())).append("';\n");
        sb.append("const method = '").append(test.getHttpMethod().name()).append("';\n");
        sb.append("const payload = ").append(test.getRequestBody() != null ? "'" + escapeJs(test.getRequestBody()) + "'" : "null").append(";\n\n");

        // Default Headers
        Map<String, String> headers = getHeadersMap(test.getRequestHeaders(), test.getAuthType(), test.getAuthValue(), test.getAuthKeyName(), test.getAuthKeyIn());
        sb.append("const defaultHeaders = ").append(toJsonString(headers)).append(";\n\n");

        // Default function
        sb.append("export default function () {\n");
        sb.append("  const params = {\n");
        sb.append("    headers: defaultHeaders,\n");
        sb.append("    timeout: '").append(test.getTimeoutMs()).append("ms',\n");
        sb.append("    redirects: ").append(test.getFollowRedirects() ? "5" : "0").append(",\n");
        sb.append("  };\n\n");

        sb.append("  const res = http.request(method, url, payload, params);\n\n");

        // Checks / Assertions
        sb.append("  check(res, {\n");
        if (test.getAssertions() != null && !test.getAssertions().isEmpty()) {
            for (int i = 0; i < test.getAssertions().size(); i++) {
                com.automationportal.perftesting.perftest.Assertion assertion = test.getAssertions().get(i);
                sb.append("    'assertion_").append(i).append("': (r) => ").append(buildCheckLambda(assertion)).append(",\n");
            }
        } else {
            sb.append("    'status is 2xx': (r) => r.status >= 200 && r.status < 300,\n");
        }
        sb.append("  });\n\n");

        sb.append("  sleep(").append(test.getThinkTimeMs() / 1000.0).append(");\n");
        sb.append("}\n");

        return sb.toString();
    }

    public String generateLoadTestScript(LoadTest test) {
        StringBuilder sb = new StringBuilder();
        sb.append("import http from 'k6/http';\n");
        sb.append("import { check, sleep } from 'k6';\n\n");

        // Options
        sb.append("export const options = {\n");
        sb.append("  stages: [\n");

        List<Stage> stages = test.getStages();
        if (stages == null || stages.isEmpty()) {
            // Auto-generate a ramp-up → steady → ramp-down shape from the convenience fields
            int rampUp = test.getRampUpSeconds() != null ? test.getRampUpSeconds() : 30;
            int steady = test.getSteadyDurationSeconds() != null ? test.getSteadyDurationSeconds() : 60;
            int rampDown = test.getRampDownSeconds() != null ? test.getRampDownSeconds() : 15;
            int maxVus = test.getMaxVirtualUsers() != null ? test.getMaxVirtualUsers() : 100;

            sb.append("    { duration: '").append(rampUp).append("s', target: ").append(maxVus).append(" },\n");
            sb.append("    { duration: '").append(steady).append("s', target: ").append(maxVus).append(" },\n");
            sb.append("    { duration: '").append(rampDown).append("s', target: 0 },\n");
        } else {
            for (Stage stage : stages) {
                sb.append("    { duration: '").append(stage.getDurationSec()).append("s', target: ").append(stage.getTargetVus()).append(" },\n");
            }
        }
        sb.append("  ],\n");

        // Thresholds
        sb.append("  thresholds: {\n");
        List<String> durationThresholds = new ArrayList<>();
        if (test.getThresholdP95Ms() != null) durationThresholds.add("'p(95)<" + test.getThresholdP95Ms() + "'");
        if (test.getThresholdP99Ms() != null) durationThresholds.add("'p(99)<" + test.getThresholdP99Ms() + "'");
        if (!durationThresholds.isEmpty()) {
            sb.append("    'http_req_duration': [").append(String.join(", ", durationThresholds)).append("],\n");
        }
        if (test.getThresholdErrorRatePct() != null) {
            double rate = test.getThresholdErrorRatePct() / 100.0;
            sb.append("    'http_req_failed': ['rate<").append(rate).append("'],\n");
        }
        sb.append("  }\n");
        sb.append("};\n\n");

        // Target Configuration
        sb.append("const url = '").append(escapeJs(test.getTargetUrl())).append("';\n");
        sb.append("const method = '").append(test.getHttpMethod().name()).append("';\n");
        sb.append("const basePayload = ").append(test.getRequestBody() != null ? "'" + escapeJs(test.getRequestBody()) + "'" : "null").append(";\n\n");

        // Default Headers
        Map<String, String> defaultHeaders = getHeadersMap(test.getRequestHeaders(), test.getAuthType(), test.getAuthValue(), test.getAuthKeyName(), test.getAuthKeyIn());
        sb.append("const defaultHeaders = ").append(toJsonString(defaultHeaders)).append(";\n\n");

        // VU Assignments configuration
        List<Map<String, Object>> profilesList = new ArrayList<>();
        int totalWeight = 0;

        if (test.getVuAssignments() != null && !test.getVuAssignments().isEmpty()) {
            for (VuAssignment assignment : test.getVuAssignments()) {
                Optional<VirtualUser> vuOpt = virtualUserRepository.findById(assignment.getVirtualUserId());
                if (vuOpt.isPresent()) {
                    VirtualUser vu = vuOpt.get();
                    Map<String, Object> profile = new HashMap<>();
                    profile.put("headers", getHeadersMap(vu.getHeaders(), vu.getAuthType(), vu.getAuthValue(), vu.getAuthKeyName(), vu.getAuthKeyIn()));
                    profile.put("weight", assignment.getVuCount());
                    profile.put("bodyTemplate", vu.getBodyTemplate());
                    profile.put("variables", getVariablesMap(vu.getVariables()));
                    profilesList.add(profile);
                    totalWeight += assignment.getVuCount();
                }
            }
        }

        if (!profilesList.isEmpty()) {
            sb.append("const vuProfiles = ").append(toJsonString(profilesList)).append(";\n");
            sb.append("const totalWeight = ").append(totalWeight).append(";\n\n");
            sb.append("function pickProfile() {\n");
            sb.append("  const r = Math.random() * totalWeight;\n");
            sb.append("  let cumulative = 0;\n");
            sb.append("  for (const p of vuProfiles) {\n");
            sb.append("    cumulative += p.weight;\n");
            sb.append("    if (r < cumulative) return p;\n");
            sb.append("  }\n");
            sb.append("  return vuProfiles[vuProfiles.length - 1];\n");
            sb.append("}\n\n");
        }

        // Default Function
        sb.append("export default function () {\n");
        if (!profilesList.isEmpty()) {
            sb.append("  const profile = pickProfile();\n");
            sb.append("  const headers = Object.assign({}, defaultHeaders, profile.headers);\n");
            sb.append("  let payload = profile.bodyTemplate || basePayload;\n");
            sb.append("  if (payload && profile.variables) {\n");
            sb.append("    for (const [key, value] of Object.entries(profile.variables)) {\n");
            sb.append("      payload = payload.replace(new RegExp('{{' + key + '}}', 'g'), value);\n");
            sb.append("    }\n");
            sb.append("  }\n");
        } else {
            sb.append("  const headers = defaultHeaders;\n");
            sb.append("  let payload = basePayload;\n");
        }

        sb.append("  const params = {\n");
        sb.append("    headers: headers,\n");
        sb.append("    timeout: '").append(test.getTimeoutMs()).append("ms',\n");
        sb.append("  };\n\n");

        sb.append("  const res = http.request(method, url, payload, params);\n\n");

        // Checks / Assertions
        sb.append("  check(res, {\n");
        if (test.getAssertions() != null && !test.getAssertions().isEmpty()) {
            for (int i = 0; i < test.getAssertions().size(); i++) {
                com.automationportal.perftesting.perftest.Assertion assertion = test.getAssertions().get(i);
                sb.append("    'assertion_").append(i).append("': (r) => ").append(buildCheckLambda(assertion)).append(",\n");
            }
        } else {
            sb.append("    'status is 2xx': (r) => r.status >= 200 && r.status < 300,\n");
        }
        sb.append("  });\n\n");

        sb.append("  sleep(1);\n"); // Default 1s VU think time
        sb.append("}\n");

        return sb.toString();
    }

    private String escapeJs(String input) {
        if (input == null) return "";
        return input.replace("'", "\\'").replace("\n", "\\n").replace("\r", "");
    }

    private String toJsonString(Object obj) {
        try {
            return mapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }

    private Map<String, String> getHeadersMap(List<KeyValue> extraHeaders, AuthType authType, String authValue, String keyName, AuthKeyIn keyIn) {
        Map<String, String> headers = new HashMap<>();
        if (extraHeaders != null) {
            for (KeyValue kv : extraHeaders) {
                headers.put(kv.key(), kv.value());
            }
        }
        if (authType != null && authValue != null && !authValue.isBlank()) {
            switch (authType) {
                case BEARER:
                    headers.put("Authorization", "Bearer " + authValue);
                    break;
                case BASIC:
                    headers.put("Authorization", "Basic " + authValue);
                    break;
                case API_KEY:
                    if (keyIn == AuthKeyIn.HEADER) {
                        headers.put(keyName != null ? keyName : "X-API-KEY", authValue);
                    }
                    break;
            }
        }
        return headers;
    }

    private Map<String, String> getVariablesMap(List<com.automationportal.perftesting.common.Variable> variables) {
        Map<String, String> varsMap = new HashMap<>();
        if (variables != null) {
            for (com.automationportal.perftesting.common.Variable v : variables) {
                varsMap.put(v.key(), v.value());
            }
        }
        return varsMap;
    }

    private String buildCheckLambda(com.automationportal.perftesting.perftest.Assertion assertion) {
        String val = assertion.getValue() != null ? assertion.getValue() : "";
        switch (assertion.getType().toUpperCase()) {
            case "STATUS":
                if ("IN".equalsIgnoreCase(assertion.getOperator())) {
                    return "[" + val + "].map(String).includes(String(r.status))";
                } else if ("LT".equalsIgnoreCase(assertion.getOperator())) {
                    return "r.status < " + val;
                } else if ("GT".equalsIgnoreCase(assertion.getOperator())) {
                    return "r.status > " + val;
                } else if ("NE".equalsIgnoreCase(assertion.getOperator())) {
                    return "r.status != " + val;
                }
                return "r.status == " + val;

            case "BODY_CONTAINS":
                return "r.body && r.body.includes('" + escapeJs(val) + "')";

            case "HEADER_EXISTS":
                return "r.headers && r.headers['" + escapeJs(assertion.getKey()) + "'] !== undefined";

            case "HEADER_VALUE":
                if ("CONTAINS".equalsIgnoreCase(assertion.getOperator())) {
                    return "r.headers && r.headers['" + escapeJs(assertion.getKey()) + "'] && r.headers['" + escapeJs(assertion.getKey()) + "'].includes('" + escapeJs(val) + "')";
                }
                return "r.headers && r.headers['" + escapeJs(assertion.getKey()) + "'] === '" + escapeJs(val) + "'";

            case "RESPONSE_TIME":
                if ("GT".equalsIgnoreCase(assertion.getOperator())) {
                    return "r.timings.duration > " + val;
                }
                return "r.timings.duration < " + val;

            case "JSON_PATH":
                // Standard JSONPath is complex in JS, we can extract basic root fields or fall back to checking if path string matches
                // For simplicity in JS check, we check if the response body JSON parses and satisfies a property lookup
                String cleanPath = assertion.getPath().replace("$.", "").replace("[", "['").replace("]", "']");
                return "(() => { try { const json = JSON.parse(r.body); return json." + cleanPath + " == '" + escapeJs(val) + "'; } catch(e) { return false; } })()";

            default:
                return "true";
        }
    }
}
