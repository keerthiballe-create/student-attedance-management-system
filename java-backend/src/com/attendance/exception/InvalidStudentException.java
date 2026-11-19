package com.attendance.exception;

/**
 * Unit 2: Custom checked exception thrown when student roll number or name is invalid.
 */
public class InvalidStudentException extends Exception {
    private final int statusCode;

    public InvalidStudentException(String message) {
        this(message, 400);
    }

    public InvalidStudentException(String message, int statusCode) {
        super(message);
        this.statusCode = statusCode;
    }

    public int getStatusCode() {
        return statusCode;
    }
}
