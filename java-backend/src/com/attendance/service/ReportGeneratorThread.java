package com.attendance.service;

import com.attendance.model.Person;
import com.attendance.util.GenericProcessor;

import java.util.List;
import java.util.function.Supplier;

/**
 * Unit 3: Background report-generation thread extending Thread,
 * demonstrating setPriority, synchronized, wait(), and notify().
 */
public class ReportGeneratorThread extends Thread {
    private final Object reportLock = new Object();
    private final Supplier<List<? extends Person>> membersSupplier;

    private volatile boolean running = true;
    private boolean jobPending = false;
    private List<String> latestLines = List.of();

    public ReportGeneratorThread(Supplier<List<? extends Person>> membersSupplier) {
        super("ReportGeneratorThread");
        this.membersSupplier = membersSupplier;
        setDaemon(true);
        setPriority(Thread.NORM_PRIORITY - 1);
    }

    public void triggerGeneration() {
        synchronized (reportLock) {
            jobPending = true;
            reportLock.notify();
        }
    }

    public void shutdown() {
        running = false;
        synchronized (reportLock) {
            reportLock.notifyAll();
        }
    }

    public synchronized List<String> getLatestReportLines() {
        return latestLines;
    }

    @Override
    public void run() {
        while (running) {
            synchronized (reportLock) {
                while (running && !jobPending) {
                    try {
                        reportLock.wait();
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        return;
                    }
                }
                if (!running) break;
                jobPending = false;
            }

            List<? extends Person> members = membersSupplier.get();
            List<String> generated = GenericProcessor.summarizeAllMembers(members);
            synchronized (this) {
                this.latestLines = generated;
            }
        }
    }
}
