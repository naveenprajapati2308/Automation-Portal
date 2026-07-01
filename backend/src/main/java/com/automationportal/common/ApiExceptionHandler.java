package com.automationportal.common;

import org.springframework.http.HttpStatus;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> badRequest(RuntimeException exception) {
        return ApiResponse.error(exception.getMessage());
    }

    /** Returns the first field validation message so the UI can show it. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> validation(MethodArgumentNotValidException exception) {
        String msg = exception.getBindingResult().getFieldErrors().stream()
            .findFirst()
            .map(FieldError::getDefaultMessage)
            .orElse("Validation failed");
        return ApiResponse.error(msg);
    }
}
