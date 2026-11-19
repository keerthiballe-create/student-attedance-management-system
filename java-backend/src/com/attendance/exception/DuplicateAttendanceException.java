package com.attendance.exception;

/**
 * Unit 2: Custom checked exception thrown when attendance is already recorded for (date, subject).
 */
public class DuplicateAttendanceException extends Exception {
    private final String date;
    private final String subject;

    public DuplicateAttendanceException(String date, String subject) {
        super("Attendance already marked for " + subject + " on " + date + ".");
        this.date = date;
        this.subject = subject;
    }

    public String getDate() {
        return date;
    }

    public String getSubject() {
        return subject;
    }
}
