package com.attendance.dao;

import java.sql.SQLException;
import java.util.List;
import java.util.Optional;

/**
 * Unit 5 & 4: Generic DAO<T, ID> interface for CRUD persistence.
 */
public interface DAO<T, ID> {
    void save(T entity) throws SQLException;
    Optional<T> findById(ID id) throws SQLException;
    List<T> findAll() throws SQLException;
    boolean update(T entity) throws SQLException;
    boolean deleteById(ID id) throws SQLException;
}
