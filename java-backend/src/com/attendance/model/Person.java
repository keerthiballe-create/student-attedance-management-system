package com.attendance.model;

/**
 * Unit 1 & 2: Abstract base class Person demonstrating access specifiers,
 * static/final constants, constructor overloading, and abstract method overriding.
 */
public abstract class Person implements Reportable {
    public static final String INSTITUTION_NAME = "Academic Attendance Ledger";
    private static int totalInstancesCreated = 0;

    private final String id;
    protected String name;
    String email; // package-private access specifier

    // Constructor 1 (overloaded)
    protected Person(String id, String name) {
        this(id, name, "");
    }

    // Constructor 2 (overloaded)
    protected Person(String id, String name, String email) {
        this.id = id;
        this.name = name;
        this.email = email;
        totalInstancesCreated++;
    }

    public static int getTotalInstancesCreated() {
        return totalInstancesCreated;
    }

    public final String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    // Abstract method for runtime polymorphism
    public abstract String getRole();

    public String getDisplayHeader() {
        return "[" + INSTITUTION_NAME + "] " + getRole() + ": " + name;
    }
}
