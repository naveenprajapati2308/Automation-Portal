package com.automationportal.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class MailService {
    private static final Logger log = LoggerFactory.getLogger(MailService.class);
    private final JavaMailSender sender;
    private final boolean consoleOnly;
    private final String from;

    public MailService(JavaMailSender sender,
                       @Value("${portal.mail.console-only}") boolean consoleOnly,
                       @Value("${portal.mail.from}") String from) {
        this.sender = sender;
        this.consoleOnly = consoleOnly;
        this.from = from;
    }

    public void sendOtp(String email, String otp, OtpPurpose purpose) {
        if (consoleOnly) {
            log.info("OTP for {} {} is {}", purpose, email, otp);
            return;
        }
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(email);
        message.setSubject("Automation Portal verification code");
        message.setText("Your " + purpose + " OTP is: " + otp);
        sender.send(message);
    }
}
