package com.attendance.model;

/**
 * Unit 1 & 2: Teacher extends Person directly, demonstrating super() and runtime polymorphism.
 */
public class Teacher extends Person {
    private String department;
    private String passwordHash;

    public Teacher(String id, String name, String email, String department, String passwordHash) {
        super(id, name, email);
        this.department = (department == null || department.isBlank()) ? "Faculty" : department.trim();
        this.passwordHash = passwordHash;
    }

    public String getDepartment() {
        return department;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    @Override
    public String getRole() {
        return "Teacher";
    }

    @Override
    public boolean isEligible() {
        return true; // Active faculty account
    }

    @Override
    public String generateReportLine() {
        return String.format("Faculty %s | %s <%s> | Dept: %s", getId(), name, email, department);
    }
}
