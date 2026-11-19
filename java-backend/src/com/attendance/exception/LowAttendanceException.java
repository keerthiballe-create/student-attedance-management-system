package com.attendance.exception;

/**
 * Unit 2: Custom checked exception thrown when a student's attendance falls below 75%.
 */
public class LowAttendanceException extends Exception {
    private final int rollNo;
    private final double percentage;

    public LowAttendanceException(int rollNo, double percentage) {
        super(String.format("Student Roll %d has low attendance: %.2f%% (below 75.00%% threshold).", rollNo, percentage));
        this.rollNo = rollNo;
        this.percentage = percentage;
    }

    public int getRollNo() {
        return rollNo;
    }

    public double getPercentage() {
        return percentage;
    }
}
