package com.attendance.model;

/**
 * Unit 1 & 2: Student extends AcademicMember (multilevel: Person -> AcademicMember -> Student),
 * demonstrates super(), constructor/method overloading, and method overriding.
 */
public class Student extends AcademicMember {
    public static final double ELIGIBILITY_THRESHOLD = 75.0;

    private final int rollNo;
    private int totalClasses;
    private int attendedClasses;

    // Overloaded Constructor 1
    public Student(int rollNo, String name) {
        this(rollNo, name, "", "Computer Science");
    }

    // Overloaded Constructor 2
    public Student(int rollNo, String name, String email, String department) {
        super("S-" + rollNo, name, email, department);
        this.rollNo = rollNo;
    }

    public int getRollNo() {
        return rollNo;
    }

    public int getTotalClasses() {
        return totalClasses;
    }

    public int getAttendedClasses() {
        return attendedClasses;
    }

    // Method Overloading 1: update counts directly
    public void updateStats(int totalClasses, int attendedClasses) {
        this.totalClasses = totalClasses;
        this.attendedClasses = attendedClasses;
    }

    // Method Overloading 2: increment from a single status ("P" or "A")
    public void updateStats(String status) {
        this.totalClasses++;
        if ("P".equalsIgnoreCase(status)) {
            this.attendedClasses++;
        }
    }

    public double getAttendancePercentage() {
        return totalClasses == 0 ? 0.0 : (attendedClasses * 100.0) / totalClasses;
    }

    @Override
    public String getRole() {
        return "Student";
    }

    @Override
    public boolean isEligible() {
        return totalClasses > 0 && getAttendancePercentage() >= ELIGIBILITY_THRESHOLD;
    }

    @Override
    public String generateReportLine() {
        return String.format("Roll %d | %s (%s) | %d/%d (%.2f%%) | %s",
                rollNo, name, department, attendedClasses, totalClasses,
                getAttendancePercentage(),
                totalClasses == 0 ? "No Records" : (isEligible() ? "Eligible" : "Shortage"));
    }
}
