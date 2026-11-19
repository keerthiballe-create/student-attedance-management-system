package com.attendance.dao;

import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import java.util.function.Predicate;
import java.util.stream.Collectors;

/**
 * Unit 5: Generic Repository<T, ID> abstract base and concrete JdbcRepository<T, ID>
 * demonstrating a generic class hierarchy.
 */
public abstract class Repository<T, ID> {
    protected final DAO<T, ID> dao;

    protected Repository(DAO<T, ID> dao) {
        this.dao = dao;
    }

    public abstract List<T> search(Predicate<T> filter) throws SQLException;

    public void add(T entity) throws SQLException {
        dao.save(entity);
    }

    public Optional<T> get(ID id) throws SQLException {
        return dao.findById(id);
    }

    public List<T> list() throws SQLException {
        return dao.findAll();
    }

    public boolean modify(T entity) throws SQLException {
        return dao.update(entity);
    }

    public boolean remove(ID id) throws SQLException {
        return dao.deleteById(id);
    }

    public static class JdbcRepository<T, ID> extends Repository<T, ID> {
        public JdbcRepository(DAO<T, ID> dao) {
            super(dao);
        }

        @Override
        public List<T> search(Predicate<T> filter) throws SQLException {
            return dao.findAll().stream().filter(filter).collect(Collectors.toList());
        }
    }
}
