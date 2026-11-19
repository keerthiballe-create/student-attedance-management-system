package com.attendance.model;

/**
 * Unit 1: Intermediate class enabling multilevel inheritance:
 * Person -> AcademicMember -> Student
 */
public abstract class AcademicMember extends Person {
    protected String department;

    protected AcademicMember(String id, String name, String email, String department) {
        super(id, name, email);
        this.department = (department == null || department.isBlank()) ? "General" : department.trim();
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }
}
