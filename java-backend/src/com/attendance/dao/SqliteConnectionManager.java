package com.attendance.dao;

import java.io.File;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * Unit 4: Manages JDBC connections and schema initialization for SQLite.
 */
public final class SqliteConnectionManager {
    public static final String DB_PATH = "data/attendance.db";
    public static final String JDBC_URL = "jdbc:sqlite:" + DB_PATH;

    private SqliteConnectionManager() {}

    public static Connection getConnection() throws SQLException {
        File dbFile = new File(DB_PATH);
        if (dbFile.getParentFile() != null) {
            dbFile.getParentFile().mkdirs();
        }
        return DriverManager.getConnection(JDBC_URL);
    }

    public static void initializeSchema() throws SQLException {
        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement()) {

            stmt.execute("PRAGMA foreign_keys = ON;");

            stmt.execute("CREATE TABLE IF NOT EXISTS students (" +
                    "roll_no INTEGER PRIMARY KEY, " +
                    "name TEXT NOT NULL, " +
                    "email TEXT DEFAULT '', " +
                    "department TEXT DEFAULT 'Computer Science'" +
                    ");");

            stmt.execute("CREATE TABLE IF NOT EXISTS teachers (" +
                    "id TEXT PRIMARY KEY, " +
                    "name TEXT NOT NULL, " +
                    "email TEXT NOT NULL UNIQUE, " +
                    "department TEXT NOT NULL, " +
                    "password_hash TEXT NOT NULL" +
                    ");");

            stmt.execute("CREATE TABLE IF NOT EXISTS attendance_records (" +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                    "date TEXT NOT NULL, " +
                    "subject TEXT NOT NULL, " +
                    "roll_no INTEGER NOT NULL, " +
                    "status TEXT NOT NULL CHECK(status IN ('P', 'A')), " +
                    "UNIQUE(date, subject, roll_no), " +
                    "FOREIGN KEY(roll_no) REFERENCES students(roll_no) ON DELETE CASCADE" +
                    ");");
        }
    }
}
