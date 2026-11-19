package com.attendance.dao;

import com.attendance.model.AttendanceRecord;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Unit 4: JDBC CRUD implementation with PreparedStatement on SQLite for AttendanceRecord.
 */
public class AttendanceJdbcDAO implements DAO<AttendanceRecord, Long> {

    @Override
    public void save(AttendanceRecord record) throws SQLException {
        String sql = "INSERT INTO attendance_records (date, subject, roll_no, status) VALUES (?, ?, ?, ?)";
        try (Connection conn = SqliteConnectionManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setString(1, record.getDate());
            ps.setString(2, record.getSubject());
            ps.setInt(3, record.getRollNo());
            ps.setString(4, record.getStatus());
            ps.executeUpdate();
            try (ResultSet keys = ps.getGeneratedKeys()) {
                if (keys.next()) {
                    record.setId(keys.getLong(1));
                }
            }
        }
    }

    public void saveSessionBatch(List<AttendanceRecord> batch, boolean replaceExisting) throws SQLException {
        try (Connection conn = SqliteConnectionManager.getConnection()) {
            conn.setAutoCommit(false);
            try {
                if (replaceExisting && !batch.isEmpty()) {
                    String delSql = "DELETE FROM attendance_records WHERE date = ? AND LOWER(subject) = LOWER(?)";
                    try (PreparedStatement delPs = conn.prepareStatement(delSql)) {
                        delPs.setString(1, batch.get(0).getDate());
                        delPs.setString(2, batch.get(0).getSubject());
                        delPs.executeUpdate();
                    }
                }
                String insSql = "INSERT INTO attendance_records (date, subject, roll_no, status) VALUES (?, ?, ?, ?)";
                try (PreparedStatement ps = conn.prepareStatement(insSql)) {
                    for (AttendanceRecord r : batch) {
                        ps.setString(1, r.getDate());
                        ps.setString(2, r.getSubject());
                        ps.setInt(3, r.getRollNo());
                        ps.setString(4, r.getStatus());
                        ps.addBatch();
                    }
                    ps.executeBatch();
                }
                conn.commit();
            } catch (SQLException ex) {
                conn.rollback();
                throw ex;
            }
        }
    }

    @Override
    public Optional<AttendanceRecord> findById(Long id) throws SQLException {
        String sql = "SELECT id, date, subject, roll_no, status FROM attendance_records WHERE id = ?";
        try (Connection conn = SqliteConnectionManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(mapRow(rs));
                }
            }
        }
        return Optional.empty();
    }

    @Override
    public List<AttendanceRecord> findAll() throws SQLException {
        String sql = "SELECT id, date, subject, roll_no, status FROM attendance_records ORDER BY date DESC, subject ASC, roll_no ASC";
        List<AttendanceRecord> list = new ArrayList<>();
        try (Connection conn = SqliteConnectionManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                list.add(mapRow(rs));
            }
        }
        return list;
    }

    public boolean existsSession(String date, String subject) throws SQLException {
        String sql = "SELECT 1 FROM attendance_records WHERE date = ? AND LOWER(subject) = LOWER(?) LIMIT 1";
        try (Connection conn = SqliteConnectionManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, date);
            ps.setString(2, subject);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }

    public boolean correctStatus(int rollNo, String subject, String date, String newStatus) throws SQLException {
        String sql = "UPDATE attendance_records SET status = ? WHERE roll_no = ? AND LOWER(subject) = LOWER(?) AND date = ?";
        try (Connection conn = SqliteConnectionManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, newStatus);
            ps.setInt(2, rollNo);
            ps.setString(3, subject);
            ps.setString(4, date);
            return ps.executeUpdate() > 0;
        }
    }

    @Override
    public boolean update(AttendanceRecord record) throws SQLException {
        String sql = "UPDATE attendance_records SET status = ? WHERE id = ?";
        try (Connection conn = SqliteConnectionManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, record.getStatus());
            ps.setLong(2, record.getId());
            return ps.executeUpdate() > 0;
        }
    }

    @Override
    public boolean deleteById(Long id) throws SQLException {
        String sql = "DELETE FROM attendance_records WHERE id = ?";
        try (Connection conn = SqliteConnectionManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, id);
            return ps.executeUpdate() > 0;
        }
    }

    public void deleteAll() throws SQLException {
        try (Connection conn = SqliteConnectionManager.getConnection();
             PreparedStatement ps = conn.prepareStatement("DELETE FROM attendance_records")) {
            ps.executeUpdate();
        }
    }

    private AttendanceRecord mapRow(ResultSet rs) throws SQLException {
        return new AttendanceRecord(
                rs.getLong("id"),
                rs.getString("date"),
                rs.getString("subject"),
                rs.getInt("roll_no"),
                rs.getString("status")
        );
    }
}
