package com.attendance.service;

import com.attendance.dao.SqliteConnectionManager;
import com.attendance.util.ByteStreamBackupUtil;

import java.io.File;
import java.io.IOException;

/**
 * Unit 3: Periodic background backup thread implemented via Runnable,
 * using synchronized, wait(), notify(), thread priority, and byte streams.
 */
public class BackupTask implements Runnable {
    private final Object backupLock = new Object();
    private final File sourceDb = new File(SqliteConnectionManager.DB_PATH);
    private final File backupDb = new File("data/backups/attendance_backup.db");
    private final long intervalMillis;

    private volatile boolean running = true;
    private boolean backupRequested = false;
    private long lastBackupBytes = 0L;

    public BackupTask(long intervalMillis) {
        this.intervalMillis = intervalMillis;
    }

    public void requestImmediateBackup() {
        synchronized (backupLock) {
            backupRequested = true;
            backupLock.notify();
        }
    }

    public void stopTask() {
        running = false;
        synchronized (backupLock) {
            backupLock.notifyAll();
        }
    }

    public synchronized long getLastBackupBytes() {
        return lastBackupBytes;
    }

    @Override
    public void run() {
        Thread.currentThread().setPriority(Thread.MIN_PRIORITY + 2);
        while (running) {
            synchronized (backupLock) {
                try {
                    if (!backupRequested) {
                        backupLock.wait(intervalMillis);
                    }
                    backupRequested = false;
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }

            if (!running) break;

            if (sourceDb.exists()) {
                try {
                    long bytes = ByteStreamBackupUtil.copyUsingByteStreams(sourceDb, backupDb);
                    synchronized (this) {
                        lastBackupBytes = bytes;
                    }
                } catch (IOException e) {
                    System.err.println("BackupTask IO warning: " + e.getMessage());
                }
            }
        }
    }
}
