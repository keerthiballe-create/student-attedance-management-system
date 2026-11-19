package com.attendance.util;

import com.attendance.exception.InvalidStudentException;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;

/**
 * Unit 2: Demonstrates try / catch / multiple catch / nested try / throw / throws / finally.
 */
public final class ValidationUtil {
    private ValidationUtil() {}

    public static int parsePositiveRollNo(String rawRoll) throws InvalidStudentException {
        boolean validationAttempted = false;
        try {
            validationAttempted = true;
            // Nested try block demonstrating nested exception handling
            try {
                if (rawRoll == null || rawRoll.trim().isEmpty()) {
                    throw new IllegalArgumentException("Roll number cannot be blank.");
                }
                int roll = Integer.parseInt(rawRoll.trim());
                if (roll <= 0) {
                    throw new InvalidStudentException("Roll number must be a positive integer.");
                }
                return roll;
            } catch (NumberFormatException nfe) {
                throw new InvalidStudentException("Roll number must be a valid integer: " + rawRoll);
            }
        } catch (IllegalArgumentException iae) {
            throw new InvalidStudentException(iae.getMessage());
        } finally {
            if (!validationAttempted) {
                System.err.println("Roll validation failed unexpectedly.");
            }
        }
    }

    public static void validateStudentName(String name) throws InvalidStudentException {
        if (name == null || name.trim().isEmpty() || name.contains(",")) {
            throw new InvalidStudentException("Enter a valid student name without commas.");
        }
    }

    public static void validateIsoDate(String date) throws IllegalArgumentException {
        if (date == null || !date.matches("\\d{4}-\\d{2}-\\d{2}")) {
            throw new IllegalArgumentException("Date must follow YYYY-MM-DD format.");
        }
        try {
            LocalDate.parse(date);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("Invalid calendar date: " + date);
        }
    }
}
