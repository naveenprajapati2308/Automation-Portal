package com.automationportal;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class AutomationPortalApplication {
    public static void main(String[] args) {
        SpringApplication.run(AutomationPortalApplication.class, args);
    }
}
