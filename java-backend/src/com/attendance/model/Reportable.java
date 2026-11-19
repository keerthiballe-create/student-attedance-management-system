package com.attendance.model;

/**
 * Unit 1: Interface defining reporting behavior across Person subclasses.
 */
public interface Reportable {
    String generateReportLine();
    boolean isEligible();
}
