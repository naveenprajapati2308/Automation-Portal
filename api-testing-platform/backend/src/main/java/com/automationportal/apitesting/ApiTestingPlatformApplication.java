package com.automationportal.apitesting;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class ApiTestingPlatformApplication {

    public static void main(String[] args) {
        SpringApplication.run(ApiTestingPlatformApplication.class, args);
    }
}
