package com.automationportal.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import java.util.HashMap;
import java.util.Map;

@Component
@ConfigurationProperties(prefix = "portal.automation")
public class PortalAutomationProperties {
    private String repositoryPath;
    private String mavenCommand;
    private String playwrightPath;
    private String artifactsRoot = "artifacts";
    /** Parent directory holding one subfolder per project-specific framework (test_engines
     *  .framework_path is a subfolder name under this root) — see docker-compose's
     *  PROJECT_FRAMEWORKS_ROOT bind mount, shared with the Framework Runner container. */
    private String projectFrameworksRoot;
    private Map<String, SuiteInfo> suites = new HashMap<>();
    private Map<String, String> resultFiles = new HashMap<>();

    public String getRepositoryPath() { return repositoryPath; }
    public void setRepositoryPath(String repositoryPath) { this.repositoryPath = repositoryPath; }

    public String getMavenCommand() { return mavenCommand; }
    public void setMavenCommand(String mavenCommand) { this.mavenCommand = mavenCommand; }

    public String getPlaywrightPath() { return playwrightPath; }
    public void setPlaywrightPath(String playwrightPath) { this.playwrightPath = playwrightPath; }

    public String getArtifactsRoot() { return artifactsRoot; }
    public void setArtifactsRoot(String artifactsRoot) { this.artifactsRoot = artifactsRoot; }

    public String getProjectFrameworksRoot() { return projectFrameworksRoot; }
    public void setProjectFrameworksRoot(String projectFrameworksRoot) { this.projectFrameworksRoot = projectFrameworksRoot; }

    public Map<String, SuiteInfo> getSuites() { return suites; }
    public void setSuites(Map<String, SuiteInfo> suites) { this.suites = suites; }

    public Map<String, String> getResultFiles() { return resultFiles; }
    public void setResultFiles(Map<String, String> resultFiles) { this.resultFiles = resultFiles; }

    public static class SuiteInfo {
        private String name;
        private String xml;
        private String report;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getXml() { return xml; }
        public void setXml(String xml) { this.xml = xml; }

        public String getReport() { return report; }
        public void setReport(String report) { this.report = report; }
    }
}
