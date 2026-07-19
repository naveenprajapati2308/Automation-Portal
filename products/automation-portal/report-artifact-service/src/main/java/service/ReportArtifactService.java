package service;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.File;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class ReportArtifactService {

    private static String artifactsRoot = "/app/artifacts";

    public static void main(String[] args) throws Exception {
        int port = Integer.parseInt(System.getProperty("artifacts.port", "9091"));

        String envRoot = System.getenv("ARTIFACTS_ROOT");
        if (envRoot != null && !envRoot.isEmpty()) {
            artifactsRoot = envRoot;
        } else {
            String sysRoot = System.getProperty("artifacts.root");
            if (sysRoot != null && !sysRoot.isEmpty()) {
                artifactsRoot = sysRoot;
            }
        }

        // Fallback for local run
        if (!Files.exists(Paths.get(artifactsRoot))) {
            if (Files.exists(Paths.get("D:\\Automation Portal\\backend\\artifacts"))) {
                artifactsRoot = "D:\\Automation Portal\\backend\\artifacts";
            } else if (Files.exists(Paths.get("artifacts"))) {
                artifactsRoot = "artifacts";
            } else {
                // Create local directory if running locally
                Files.createDirectories(Paths.get(artifactsRoot));
            }
        }

        System.out.println("Starting Report Artifact Service with root: " + artifactsRoot);

        HttpServer server = HttpServer.create(new InetSocketAddress("0.0.0.0", port), 0);

        server.createContext("/artifacts/list", ReportArtifactService::handleList);
        server.createContext("/artifacts/", ReportArtifactService::handleArtifacts);

        server.setExecutor(Executors.newCachedThreadPool());
        server.start();

        System.out.println("Report Artifact Service running on port " + port);
    }

    private static void handleList(HttpExchange exchange) throws IOException {
        try {
            Path executionsPath = Paths.get(artifactsRoot, "executions");
            List<String> list = new ArrayList<>();
            if (Files.exists(executionsPath)) {
                try (Stream<Path> stream = Files.list(executionsPath)) {
                    list = stream
                            .filter(Files::isDirectory)
                            .map(p -> p.getFileName().toString())
                            .collect(Collectors.toList());
                }
            }

            StringBuilder json = new StringBuilder("[");
            for (int i = 0; i < list.size(); i++) {
                json.append("\"").append(list.get(i)).append("\"");
                if (i < list.size() - 1) {
                    json.append(",");
                }
            }
            json.append("]");

            send(exchange, 200, json.toString(), "application/json");
        } catch (Exception e) {
            send(exchange, 500, "{\"error\":\"" + e.getMessage() + "\"}", "application/json");
        }
    }

    private static void handleArtifacts(HttpExchange exchange) throws IOException {
        String path = exchange.getRequestURI().getPath();
        // Expected path: /artifacts/{executionCode}/{type} or /artifacts/{executionCode}/screenshots/{file}
        String[] parts = path.split("/");
        if (parts.length < 4) {
            send(exchange, 400, "Invalid path format. Expected /artifacts/{executionCode}/{type}", "text/plain");
            return;
        }

        String executionCode = parts[2];
        String type = parts[3];

        Path executionDir = Paths.get(artifactsRoot, "executions", executionCode);
        if (!Files.exists(executionDir)) {
            send(exchange, 404, "Execution artifacts not found for: " + executionCode, "text/plain");
            return;
        }

        if ("report".equalsIgnoreCase(type)) {
            // Find Extent HTML report inside reports/ folder
            Path reportsDir = executionDir.resolve("reports");
            serveFirstHtmlFile(exchange, reportsDir);
        } else if ("emailable".equalsIgnoreCase(type)) {
            Path file = executionDir.resolve("reports/emailable-report.html");
            serveFile(exchange, file, "text/html");
        } else if ("xml".equalsIgnoreCase(type)) {
            Path file = executionDir.resolve("xml/testng-results.xml");
            serveFile(exchange, file, "application/xml");
        } else if ("logs".equalsIgnoreCase(type) && parts.length > 4 && "console".equalsIgnoreCase(parts[4])) {
            Path file = executionDir.resolve("logs/console.log");
            serveFile(exchange, file, "text/plain");
        } else if ("screenshots".equalsIgnoreCase(type)) {
            Path screenshotsDir = executionDir.resolve("screenshots");
            if (parts.length > 4) {
                // Serve specific screenshot file (handle nested directories if screenshots are in module subfolders)
                // Reconstruct full file path under screenshots/
                String subPath = path.substring(path.indexOf("/screenshots/") + 13);
                Path file = screenshotsDir.resolve(subPath);
                serveFile(exchange, file, "image/png");
            } else {
                // List all screenshots as JSON
                listScreenshots(exchange, screenshotsDir);
            }
        } else {
            send(exchange, 404, "Resource not found", "text/plain");
        }
    }

    private static void serveFirstHtmlFile(HttpExchange exchange, Path dir) throws IOException {
        if (!Files.exists(dir) || !Files.isDirectory(dir)) {
            send(exchange, 404, "Reports directory not found", "text/plain");
            return;
        }

        try (Stream<Path> stream = Files.list(dir)) {
            List<Path> htmlFiles = stream
                    .filter(p -> p.toString().endsWith(".html") && !p.getFileName().toString().contains("emailable"))
                    .collect(Collectors.toList());

            if (htmlFiles.isEmpty()) {
                send(exchange, 404, "No HTML reports found in reports folder", "text/plain");
                return;
            }

            // Prefer MasterReport.html or MasterReport2.html if they exist
            Path target = htmlFiles.get(0);
            for (Path p : htmlFiles) {
                String name = p.getFileName().toString();
                if (name.contains("MasterReport")) {
                    target = p;
                    break;
                }
            }

            serveFile(exchange, target, "text/html");
        }
    }

    private static void serveFile(HttpExchange exchange, Path file, String contentType) throws IOException {
        if (!Files.exists(file) || Files.isDirectory(file)) {
            send(exchange, 404, "File not found: " + file.getFileName(), "text/plain");
            return;
        }

        byte[] bytes = Files.readAllBytes(file);
        exchange.getResponseHeaders().set("Content-Type", contentType);
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "*");
        exchange.sendResponseHeaders(200, bytes.length);

        try (OutputStream output = exchange.getResponseBody()) {
            output.write(bytes);
        }
    }

    private static void listScreenshots(HttpExchange exchange, Path screenshotsDir) throws IOException {
        if (!Files.exists(screenshotsDir)) {
            send(exchange, 200, "[]", "application/json");
            return;
        }

        List<String> list = new ArrayList<>();
        collectFiles(screenshotsDir.toFile(), list, "");

        StringBuilder json = new StringBuilder("[");
        for (int i = 0; i < list.size(); i++) {
            json.append("\"").append(list.get(i).replace("\\", "/")).append("\"");
            if (i < list.size() - 1) {
                json.append(",");
            }
        }
        json.append("]");

        send(exchange, 200, json.toString(), "application/json");
    }

    private static void collectFiles(File dir, List<String> list, String prefix) {
        File[] files = dir.listFiles();
        if (files != null) {
            for (File f : files) {
                if (f.isDirectory()) {
                    collectFiles(f, list, prefix + f.getName() + "/");
                } else if (f.getName().endsWith(".png") || f.getName().endsWith(".jpg") || f.getName().endsWith(".jpeg")) {
                    list.add(prefix + f.getName());
                }
            }
        }
    }

    private static void send(HttpExchange exchange, int statusCode, String body, String contentType)
            throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", contentType + "; charset=utf-8");
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "*");
        exchange.sendResponseHeaders(statusCode, bytes.length);

        try (OutputStream output = exchange.getResponseBody()) {
            output.write(bytes);
        }
    }
}
