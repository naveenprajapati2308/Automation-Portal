package com.automationportal.modules;

import jakarta.persistence.*;

@Entity
@Table(name = "modules")
public class ModuleEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id")
    private Long projectId;

    private String code;
    private String name;
    private String description;
    private boolean active = true;

    @Column(name = "xml_file")
    private String xmlFile;

    @Column(name = "report_path")
    private String reportPath;

    @Column(name = "runner_type", nullable = false)
    private String runnerType = "MAVEN_TESTNG";

    /** Hides the module from the Execution Center/Dashboard pickers without disabling it. */
    private boolean visible = true;

    /** CSV of UserRole names allowed to execute this module; null/empty = unrestricted. */
    @Column(name = "allowed_roles")
    private String allowedRoles;

    /** Null for a top-level workflow module; set for a sub-type variant (e.g. one org type of Architect Empanelment). */
    @Column(name = "parent_module_id")
    private Long parentModuleId;

    /** Registered Test Engine this module dispatches through (docs/version2.3.md Plan 2); null
     *  means the legacy global shared-secret path is still used for this module. */
    @Column(name = "test_engine_id")
    private Long testEngineId;

    protected ModuleEntity() {
    }

    public ModuleEntity(String code, String name) {
        this.code = code;
        this.name = name;
    }

    public Long getId() { return id; }
    public Long getProjectId() { return projectId; }
    public void setProjectId(Long projectId) { this.projectId = projectId; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public String getXmlFile() { return xmlFile; }
    public void setXmlFile(String xmlFile) { this.xmlFile = xmlFile; }
    public String getReportPath() { return reportPath; }
    public void setReportPath(String reportPath) { this.reportPath = reportPath; }
    public String getRunnerType() { return runnerType; }
    public void setRunnerType(String runnerType) { this.runnerType = runnerType; }
    public boolean isVisible() { return visible; }
    public void setVisible(boolean visible) { this.visible = visible; }
    public String getAllowedRoles() { return allowedRoles; }
    public void setAllowedRoles(String allowedRoles) { this.allowedRoles = allowedRoles; }
    public Long getParentModuleId() { return parentModuleId; }
    public void setParentModuleId(Long parentModuleId) { this.parentModuleId = parentModuleId; }
    public Long getTestEngineId() { return testEngineId; }
    public void setTestEngineId(Long testEngineId) { this.testEngineId = testEngineId; }
}
