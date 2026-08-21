package com.automationportal.apitesting.regularapi;

import com.automationportal.apitesting.execution.ExecutionEngineService;
import com.automationportal.apitesting.execution.dto.ExecutionRequest;
import com.automationportal.apitesting.execution.dto.ExecutionResponse;
import com.jayway.jsonpath.Configuration;
import com.jayway.jsonpath.JsonPath;
import com.jayway.jsonpath.Option;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class KhasraPickerService {

    /** Bounds a scheduled run against the live government site — a village with
     * no available khasra is skipped, not retried forever. */
    private static final int MAX_VILLAGES_TO_TRY = 80;

    /** Real villages can carry hundreds of parcels; only try the first few
     * per village before moving on (see call site for why). */
    private static final int MAX_CANDIDATES_PER_VILLAGE = 10;

    private static final Configuration JSONPATH_CONFIG = Configuration.builder()
            .options(Option.SUPPRESS_EXCEPTIONS).build();

    private final RegularApiRepository regularApiRepository;
    private final RegularApiRequestBuilder requestBuilder;
    private final ExecutionEngineService engine;

    public record Result(long tehsilId, long villageWardId, String khasraNo) { }

    public static class NoAvailableKhasraException extends RuntimeException {
        NoAvailableKhasraException(String message) {
            super(message);
        }
    }

    public Result pick(Long projectId, String districtId, String isOldNew) {
        RegularApi tehsilApi = requireApi(projectId, "Get Tehsils by District");
        RegularApi villageApi = requireApi(projectId, "Get Villages by District & Tehsil");
        RegularApi bhulekhApi = requireApi(projectId, "Bhulekh Parcels by LGD Code");
        RegularApi dupApi = requireApi(projectId, "Khasra Duplicate Check");

        int villagesTried = 0;

        for (Map<String, Object> tehsil : callList(tehsilApi, Map.of("district_id", districtId), "$.data")) {
            long tehsilId = asLong(tehsil.get("id"));
            String tehsilCode = String.valueOf(tehsil.get("tehsil_code"));

            for (Map<String, Object> village : callList(villageApi,
                    Map.of("district_id", districtId, "tehsil_code", tehsilCode), "$.data")) {

                Object villageCodeObj = village.get("village_code");
                if (villageCodeObj == null || String.valueOf(villageCodeObj).isBlank()) {
                    continue; // no LGD code -> nothing to look up in Bhulekh
                }
                long villageId = asLong(village.get("id"));
                String lgdCode = String.valueOf(villageCodeObj);

                List<Map<String, Object>> parcels = callParcels(bhulekhApi, lgdCode);
                // A single village's real parcel list can run into the
                // hundreds (confirmed live: one sample village had 638) —
                // checking every one serially against the live duplicate
                // API turned a "walk villages" search into an hours-long
                // hang the first time this ran unbounded (2026-08-21). Try
                // only the first handful per village before moving on; a
                // village that has a free khasra almost always has one
                // near the front of its list, and one that doesn't isn't
                // worth exhausting entirely before escalating.
                int candidatesTried = 0;
                for (Map<String, Object> parcel : parcels) {
                    if (candidatesTried >= MAX_CANDIDATES_PER_VILLAGE) break;
                    String candidate = "New".equalsIgnoreCase(isOldNew)
                            ? blankToNull(parcel.get("plot_no"))
                            : blankToNull(parcel.get("parcel_no"));
                    if (candidate == null) continue;
                    candidatesTried++;

                    if (!isDuplicate(dupApi, villageId, candidate, isOldNew)) {
                        log.info("Khasra picker resolved district={} -> tehsil={} village={} khasra={}",
                                districtId, tehsilId, villageId, candidate);
                        return new Result(tehsilId, villageId, candidate);
                    }
                }

                villagesTried++;
                if (villagesTried >= MAX_VILLAGES_TO_TRY) {
                    throw new NoAvailableKhasraException(
                            "Khasra picker gave up after trying " + villagesTried + " villages in district "
                                    + districtId + " without finding a non-duplicate khasra number");
                }
            }
        }

        throw new NoAvailableKhasraException(
                "No available (non-duplicate) khasra number found in any tehsil/village of district " + districtId);
    }

    private boolean isDuplicate(RegularApi dupApi, long villageId, String khasraNo, String isOldNew) {
        ExecutionResponse resp = call(dupApi, Map.of(
                "village_ward_id", String.valueOf(villageId),
                "khasra_no", khasraNo,
                "is_old_new", "New".equalsIgnoreCase(isOldNew) ? "1" : "0"));
        Boolean isDuplicate = readPath(resp, "$.is_duplicate");
        // Fail closed: if the check itself failed, treat the candidate as
        // unusable rather than risk submitting a real duplicate.
        return isDuplicate == null || isDuplicate;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> callParcels(RegularApi bhulekhApi, String lgdCode) {
        ExecutionRequest request = requestBuilder.build(bhulekhApi);
        requestBuilder.substitute(request, Map.of("lgd_code", lgdCode));
        ExecutionResponse resp = engine.execute(request);
        if (!resp.isSuccess() || resp.getBody() == null) return List.of();
        List<Map<String, Object>> parcels = readPath(resp, "$.data.data");
        return parcels != null ? parcels : List.of();
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> callList(RegularApi api, Map<String, String> vars, String jsonPath) {
        ExecutionResponse resp = call(api, vars);
        List<Map<String, Object>> list = readPath(resp, jsonPath);
        return list != null ? list : List.of();
    }

    private ExecutionResponse call(RegularApi api, Map<String, String> vars) {
        ExecutionRequest request = requestBuilder.build(api);
        requestBuilder.substitute(request, vars);
        return engine.execute(request);
    }

    private <T> T readPath(ExecutionResponse resp, String path) {
        if (resp == null || !resp.isSuccess() || resp.getBody() == null) return null;
        return JsonPath.using(JSONPATH_CONFIG).parse(resp.getBody()).read(path);
    }

    private RegularApi requireApi(Long projectId, String name) {
        return regularApiRepository.findFirstByNameAndProjectId(name, projectId)
                .orElseThrow(() -> new NoAvailableKhasraException(
                        "Khasra picker misconfigured: Regular API '" + name + "' not found for project " + projectId));
    }

    private static String blankToNull(Object value) {
        if (value == null) return null;
        String s = String.valueOf(value).trim();
        return s.isEmpty() ? null : s;
    }

    private static long asLong(Object value) {
        if (value instanceof Number n) return n.longValue();
        return Long.parseLong(String.valueOf(value));
    }
}
