package runner;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.*;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class FrameworkRunnerService {

    private static final Map<String, String> SUITE_NAMES = new ConcurrentHashMap<>();
    private static volatile boolean running = false;
    private static volatile String currentJobId = "";
    private static volatile Process currentProcess = null;
    private static String frameworkPath = "/app/framework";
    private static String executionManagerUrl = "http://localhost:8090";
    private static final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    static {
        SUITE_NAMES.put("MPHIDB.xml", "Master Automation Suite");
        SUITE_NAMES.put("land.xml", "Land Management Suite");
        SUITE_NAMES.put("Emp_Arch.xml", "Architect Empanelment Suite");
        SUITE_NAMES.put("test.xml", "Test Suite");
    }

    public static void main(String[] args) throws Exception {
        int port = Integer.parseInt(System.getProperty("runner.port", "9090"));
        
        // Allow path override via system property or env variable
        String envPath = System.getenv("FRAMEWORK_PATH");
        if (envPath != null && !envPath.isEmpty()) {
            frameworkPath = envPath;
        } else {
            String sysPath = System.getProperty("framework.path");
            if (sysPath != null && !sysPath.isEmpty()) {
                frameworkPath = sysPath;
            }
        }

        // Allow EM URL override via env variable
        String emUrl = System.getenv("EXECUTION_MANAGER_URL");
        if (emUrl != null && !emUrl.isEmpty()) {
            executionManagerUrl = emUrl;
        }
        
        // If path doesn't exist, fall back to "D:\\New folder\\MPHIDB" or current directory
        if (!Files.exists(Paths.get(frameworkPath))) {
            if (Files.exists(Paths.get("D:\\New folder\\MPHIDB"))) {
                frameworkPath = "D:\\New folder\\MPHIDB";
            } else {
                frameworkPath = Paths.get("").toAbsolutePath().toString();
            }
        }

        System.out.println("Starting Framework Runner Service using path: " + frameworkPath);

        HttpServer server = HttpServer.create(new InetSocketAddress("0.0.0.0", port), 0);

        server.createContext("/runner/health", FrameworkRunnerService::handleHealth);
        server.createContext("/runner/status", FrameworkRunnerService::handleStatus);
        server.createContext("/runner/run", FrameworkRunnerService::handleRun);
        server.createContext("/runner/cancel", FrameworkRunnerService::handleCancel);
        server.createContext("/runner/suites", FrameworkRunnerService::handleSuites);

        server.setExecutor(Executors.newCachedThreadPool());
        server.start();

        System.out.println("Framework Runner Service running on port " + port);
    }

    private static void handleHealth(HttpExchange exchange) throws IOException {
        send(exchange, 200, "{\"status\":\"UP\"}", "application/json");
    }

    private static void handleStatus(HttpExchange exchange) throws IOException {
        String json = String.format(
                "{\"running\":%b,\"currentJobId\":\"%s\"}",
                running, currentJobId
        );
        send(exchange, 200, json, "application/json");
    }

    private static void handleRun(HttpExchange exchange) throws IOException {
        if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            send(exchange, 405, "{\"error\":\"Method not allowed\"}", "application/json");
            return;
        }

        if (running) {
            send(exchange, 409, "{\"error\":\"Runner is busy\"}", "application/json");
            return;
        }

        // Read request body
        String body;
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(exchange.getRequestBody(), StandardCharsets.UTF_8))) {
            body = reader.lines().collect(Collectors.joining("\n"));
        }

        String executionId = getJsonVal(body, "executionId");
        String suiteXml = getJsonVal(body, "suiteXml");
        String portalUrl = getJsonVal(body, "portalUrl");
        String apiKey = getJsonVal(body, "apiKey");

        if (executionId.isEmpty() || suiteXml.isEmpty()) {
            send(exchange, 400, "{\"error\":\"executionId and suiteXml are required\"}", "application/json");
            return;
        }

        running = true;
        currentJobId = executionId;

        // Run Maven in a separate thread
        new Thread(() -> runMaven(executionId, suiteXml, portalUrl, apiKey), "framework-maven-executor").start();

        send(exchange, 202, "{\"status\":\"STARTING\",\"executionId\":\"" + executionId + "\"}", "application/json");
    }

    private static void runMaven(String executionId, String suiteXml, String portalUrl, String apiKey) {
        try {
            System.out.println("Starting Maven run for job " + executionId + ", suite: " + suiteXml);
            
            List<String> command = new ArrayList<>();
            String os = System.getProperty("os.name").toLowerCase();
            
            // Check if mvn command is provided as env
            String mavenCmd = System.getenv("MAVEN_CMD");
            if (mavenCmd == null || mavenCmd.isEmpty()) {
                mavenCmd = os.contains("win") ? "mvn.cmd" : "mvn";
            }
            
            command.add(mavenCmd);
            command.add("test");
            command.add("-DsuiteXmlFile=" + suiteXml);
            command.add("-DexecutionId=" + executionId);
            command.add("-DportalUrl=" + portalUrl);
            command.add("-DopenReport=false");
            if (apiKey != null && !apiKey.isEmpty()) {
                command.add("-DportalApiKey=" + apiKey);
            }

            System.out.println("Command: " + String.join(" ", command));

            ProcessBuilder pb = new ProcessBuilder(command);
            pb.directory(new File(frameworkPath));
            pb.redirectErrorStream(true);

            currentProcess = pb.start();

            // Read output so process doesn't hang
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(currentProcess.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    // System print console output for Docker logs
                    System.out.println("[MAVEN] " + line);
                }
            }

            int exitCode = currentProcess.waitFor();
            System.out.println("Maven process completed with exit code: " + exitCode);

            // Notify Execution Manager that this job is complete
            notifyExecutionManagerCompleted(executionId);

        } catch (Exception e) {
            System.err.println("Exception running Maven process");
            e.printStackTrace();
            // Still notify EM even on exception so it can mark the job as ERROR
            notifyExecutionManagerCompleted(executionId);
        } finally {
            running = false;
            currentJobId = "";
            currentProcess = null;
        }
    }

    private static void notifyExecutionManagerCompleted(String jobId) {
        try {
            String url = executionManagerUrl + "/em/executions/" + jobId + "/completed";
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.noBody())
                    .timeout(Duration.ofSeconds(10))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            System.out.println("Notified Execution Manager of job completion. jobId=" + jobId + ", status=" + response.statusCode());
        } catch (Exception e) {
            System.err.println("Failed to notify Execution Manager of job completion for jobId=" + jobId);
            e.printStackTrace();
        }
    }

    private static void handleCancel(HttpExchange exchange) throws IOException {
        if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            send(exchange, 405, "{\"error\":\"Method not allowed\"}", "application/json");
            return;
        }

        if (!running || currentProcess == null) {
            send(exchange, 200, "{\"status\":\"IDLE\",\"message\":\"No running job to cancel\"}", "application/json");
            return;
        }

        try {
            System.out.println("Cancelling job: " + currentJobId);
            currentProcess.descendants().forEach(ProcessHandle::destroyForcibly);
            currentProcess.destroyForcibly();
            send(exchange, 200, "{\"status\":\"CANCELLED\",\"message\":\"Job cancelled successfully\"}", "application/json");
        } catch (Exception e) {
            send(exchange, 500, "{\"error\":\"" + e.getMessage() + "\"}", "application/json");
        }
    }

    private static void handleSuites(HttpExchange exchange) throws IOException {
        try {
            List<String> files = new ArrayList<>();
            try (Stream<Path> stream = Files.list(Paths.get(frameworkPath))) {
                files = stream
                        .map(p -> p.getFileName().toString())
                        .filter(name -> name.endsWith(".xml"))
                        .collect(Collectors.toList());
            }

            StringBuilder json = new StringBuilder("[");
            for (int i = 0; i < files.size(); i++) {
                String fileName = files.get(i);
                String suiteName = SUITE_NAMES.getOrDefault(fileName, fileName.replace(".xml", "") + " Suite");
                String key = fileName.replace(".xml", "").toLowerCase();
                
                json.append(String.format(
                        "{\"key\":\"%s\",\"name\":\"%s\",\"xml\":\"%s\"}",
                        key, suiteName, fileName
                ));
                if (i < files.size() - 1) {
                    json.append(",");
                }
            }
            json.append("]");

            send(exchange, 200, json.toString(), "application/json");
        } catch (Exception e) {
            send(exchange, 500, "{\"error\":\"" + e.getMessage() + "\"}", "application/json");
        }
    }

    private static String getJsonVal(String json, String key) {
        int idx = json.indexOf("\"" + key + "\"");
        if (idx == -1) return "";
        int colon = json.indexOf(":", idx);
        if (colon == -1) return "";
        int startQuote = json.indexOf("\"", colon);
        if (startQuote == -1 || startQuote > json.indexOf(",", colon) && json.indexOf(",", colon) != -1 || startQuote > json.indexOf("}", colon)) {
            // It's a boolean or number
            int end = json.indexOf(",", colon);
            if (end == -1) end = json.indexOf("}", colon);
            return json.substring(colon + 1, end).trim();
        }
        int endQuote = json.indexOf("\"", startQuote + 1);
        if (endQuote == -1) return "";
        return json.substring(startQuote + 1, endQuote);
    }

    private static void send(HttpExchange exchange, int statusCode, String body, String contentType)
            throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", contentType + "; charset=utf-8");
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "*");
        exchange.sendResponseHeaders(statusCode, bytes.length);

        try (OutputStream output = exchange.getResponseBody()) {
            output.write(bytes);
        }
    }
}
