package com.attendance.util;

import com.attendance.model.Person;
import com.attendance.model.Reportable;

import java.util.ArrayList;
import java.util.List;

/**
 * Unit 5: Generic interface, generic class hierarchy, bounded generic method,
 * and wildcard method List<? extends Person>.
 */
public class GenericProcessor {

    // Generic interface
    public interface Transformer<I, O> {
        O transform(I input);
    }

    // Generic class hierarchy: BaseValidator<T> -> StrictValidator<T>
    public static class BaseValidator<T> {
        public boolean isPresent(T item) {
            return item != null;
        }
    }

    public static class StrictValidator<T extends Person> extends BaseValidator<T> {
        @Override
        public boolean isPresent(T item) {
            return super.isPresent(item)
                    && item.getName() != null
                    && !item.getName().isBlank();
        }
    }

    // Bounded generic method (<T extends Person & Reportable>)
    public static <T extends Person & Reportable> List<String> formatEligibleReports(List<T> members) {
        List<String> lines = new ArrayList<>();
        for (T member : members) {
            if (member.isEligible()) {
                lines.add(member.generateReportLine());
            }
        }
        return lines;
    }

    // Wildcard method (List<? extends Person>) demonstrating runtime polymorphism
    public static List<String> summarizeAllMembers(List<? extends Person> people) {
        List<String> output = new ArrayList<>();
        for (Person p : people) {
            output.add(p.getDisplayHeader() + " | " + p.generateReportLine());
        }
        return output;
    }
}
