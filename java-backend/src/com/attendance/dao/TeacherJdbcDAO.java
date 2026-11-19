package com.attendance.dao;

import com.attendance.model.Teacher;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Unit 4: JDBC CRUD implementation with PreparedStatement on SQLite for Teacher accounts.
 */
public class TeacherJdbcDAO implements DAO<Teacher, String> {

    @Override
    public void save(Teacher teacher) throws SQLException {
        String sql = "INSERT INTO teachers (id, name, email, department, password_hash) VALUES (?, ?, ?, ?, ?)";
        try (Connection conn = SqliteConnectionManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, teacher.getId());
            ps.setString(2, teacher.getName());
            ps.setString(3, teacher.getEmail().toLowerCase());
            ps.setString(4, teacher.getDepartment());
            ps.setString(5, teacher.getPasswordHash());
            ps.executeUpdate();
        }
    }

    @Override
    public Optional<Teacher> findById(String id) throws SQLException {
        String sql = "SELECT id, name, email, department, password_hash FROM teachers WHERE id = ?";
        try (Connection conn = SqliteConnectionManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) return Optional.of(mapRow(rs));
            }
        }
        return Optional.empty();
    }

    public Optional<Teacher> findByEmail(String email) throws SQLException {
        String sql = "SELECT id, name, email, department, password_hash FROM teachers WHERE LOWER(email) = LOWER(?)";
        try (Connection conn = SqliteConnectionManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, email);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) return Optional.of(mapRow(rs));
            }
        }
        return Optional.empty();
    }

    @Override
    public List<Teacher> findAll() throws SQLException {
        String sql = "SELECT id, name, email, department, password_hash FROM teachers ORDER BY name ASC";
        List<Teacher> list = new ArrayList<>();
        try (Connection conn = SqliteConnectionManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) list.add(mapRow(rs));
        }
        return list;
    }

    @Override
    public boolean update(Teacher teacher) throws SQLException {
        String sql = "UPDATE teachers SET name = ?, department = ?, password_hash = ? WHERE id = ?";
        try (Connection conn = SqliteConnectionManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, teacher.getName());
            ps.setString(2, teacher.getDepartment());
            ps.setString(3, teacher.getPasswordHash());
            ps.setString(4, teacher.getId());
            return ps.executeUpdate() > 0;
        }
    }

    @Override
    public boolean deleteById(String id) throws SQLException {
        String sql = "DELETE FROM teachers WHERE id = ?";
        try (Connection conn = SqliteConnectionManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, id);
            return ps.executeUpdate() > 0;
        }
    }

    private Teacher mapRow(ResultSet rs) throws SQLException {
        return new Teacher(
                rs.getString("id"),
                rs.getString("name"),
                rs.getString("email"),
                rs.getString("department"),
                rs.getString("password_hash")
        );
    }
}
