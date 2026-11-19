package com.attendance.dao;

import com.attendance.model.Student;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Unit 4: JDBC CRUD implementation with PreparedStatement on SQLite for Student.
 */
public class StudentJdbcDAO implements DAO<Student, Integer> {

    @Override
    public void save(Student student) throws SQLException {
        String sql = "INSERT INTO students (roll_no, name, email, department) VALUES (?, ?, ?, ?)";
        try (Connection conn = SqliteConnectionManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, student.getRollNo());
            ps.setString(2, student.getName());
            ps.setString(3, student.getEmail());
            ps.setString(4, student.getDepartment());
            ps.executeUpdate();
        }
    }

    @Override
    public Optional<Student> findById(Integer rollNo) throws SQLException {
        String sql = "SELECT roll_no, name, email, department FROM students WHERE roll_no = ?";
        try (Connection conn = SqliteConnectionManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, rollNo);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(new Student(
                            rs.getInt("roll_no"),
                            rs.getString("name"),
                            rs.getString("email"),
                            rs.getString("department")
                    ));
                }
            }
        }
        return Optional.empty();
    }

    @Override
    public List<Student> findAll() throws SQLException {
        String sql = "SELECT roll_no, name, email, department FROM students ORDER BY roll_no ASC";
        List<Student> list = new ArrayList<>();
        try (Connection conn = SqliteConnectionManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                list.add(new Student(
                        rs.getInt("roll_no"),
                        rs.getString("name"),
                        rs.getString("email"),
                        rs.getString("department")
                ));
            }
        }
        return list;
    }

    @Override
    public boolean update(Student student) throws SQLException {
        String sql = "UPDATE students SET name = ?, email = ?, department = ? WHERE roll_no = ?";
        try (Connection conn = SqliteConnectionManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, student.getName());
            ps.setString(2, student.getEmail());
            ps.setString(3, student.getDepartment());
            ps.setInt(4, student.getRollNo());
            return ps.executeUpdate() > 0;
        }
    }

    @Override
    public boolean deleteById(Integer rollNo) throws SQLException {
        String sql = "DELETE FROM students WHERE roll_no = ?";
        try (Connection conn = SqliteConnectionManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, rollNo);
            return ps.executeUpdate() > 0;
        }
    }
}
