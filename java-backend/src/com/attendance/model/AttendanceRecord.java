package com.attendance.model;

/**
 * Unit 1 & 2: AttendanceRecord entity with constructor overloading and final constants.
 */
public class AttendanceRecord {
    public static final String STATUS_PRESENT = "P";
    public static final String STATUS_ABSENT = "A";

    private long id;
    private final String date;
    private final String subject;
    private final int rollNo;
    private String status;

    public AttendanceRecord(String date, String subject, int rollNo, String status) {
        this(0L, date, subject, rollNo, status);
    }

    public AttendanceRecord(long id, String date, String subject, int rollNo, String status) {
        this.id = id;
        this.date = date;
        this.subject = subject;
        this.rollNo = rollNo;
        this.status = status;
    }

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public String getDate() {
        return date;
    }

    public String getSubject() {
        return subject;
    }

    public int getRollNo() {
        return rollNo;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
