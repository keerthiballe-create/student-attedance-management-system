package com.attendance.controller;

import com.attendance.dao.SqliteConnectionManager;
import com.attendance.model.Person;
import com.attendance.service.AttendanceService;
import com.attendance.service.BackupTask;
import com.attendance.service.ReportGeneratorThread;

import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Application entry point initializing SQLite JDBC schema, starting background threads
 * (BackupTask Runnable + ReportGeneratorThread), and launching the HTTP server.
 */
public class Main {
    public static void main(String[] args) {
        try {
            SqliteConnectionManager.initializeSchema();

            BackupTask backupTask = new BackupTask(60_000L);
            Thread backupThread = new Thread(backupTask, "PeriodicBackupThread");
            backupThread.setDaemon(true);
            backupThread.setPriority(Thread.MIN_PRIORITY + 2);
            backupThread.start();

            AtomicReference<AttendanceService> serviceRef = new AtomicReference<>();
            ReportGeneratorThread reportThread = new ReportGeneratorThread(() -> {
                AttendanceService svc = serviceRef.get();
                return svc == null ? List.<Person>of() : svc.getDirectory().getStudents();
            });
            reportThread.start();

            AttendanceService service = new AttendanceService(backupTask, reportThread);
            serviceRef.set(service);
            reportThread.triggerGeneration();

            AttendanceHttpController controller = new AttendanceHttpController(service, 8080);
            controller.start();
            System.out.println("Default teacher login -> email: teacher@college.edu | password: password123");
        } catch (Exception e) {
            System.err.println("Startup failed: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
