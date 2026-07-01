package com.automationportal.modules;

import jakarta.persistence.*;

@Entity
@Table(name = "modules")
public class ModuleEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String code;
    private String name;
    private String description;
    private boolean active = true;

    @Column(name = "xml_file")
    private String xmlFile;

    @Column(name = "report_path")
    private String reportPath;

    protected ModuleEntity() {
    }

    public ModuleEntity(String code, String name) {
        this.code = code;
        this.name = name;
    }

    public Long getId() { return id; }
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
}
