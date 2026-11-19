package com.attendance.controller;

import com.attendance.exception.GlobalExceptionHandler;
import com.attendance.model.AttendanceRecord;
import com.attendance.model.Student;
import com.attendance.model.Teacher;
import com.attendance.service.AttendanceService;
import com.attendance.util.Pair;
import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Unit 1 & 2: HTTP Controller mapping REST API routes and routing unhandled or domain exceptions
 * through GlobalExceptionHandler (supporting JSON API errors and HTML Global Error Pages).
 */
public class AttendanceHttpController {
    private final AttendanceService service;
    private final int port;

    public AttendanceHttpController(AttendanceService service, int port) {
        this.service = service;
        this.port = port;
    }

    public void start() throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress("0.0.0.0", port), 0);
        server.setExecutor(Executors.newFixedThreadPool(8));

        server.createContext("/api/auth/login", ex -> wrap(ex, () -> {
            String body = readBody(ex);
            String email = extractString(body, "email");
            String password = extractString(body, "password");
            Pair<String, Teacher> result = service.loginTeacher(email, password);
            sendJson(ex, 200, "{\"token\":\"" + result.getKey() + "\",\"teacher\":" + teacherJson(result.getValue()) + "}");
        }));

        server.createContext("/api/auth/register", ex -> wrap(ex, () -> {
            String body = readBody(ex);
            Pair<String, Teacher> result = service.registerTeacher(
                    extractString(body, "name"),
                    extractString(body, "email"),
                    extractString(body, "department"),
                    extractString(body, "password")
            );
            sendJson(ex, 201, "{\"token\":\"" + result.getKey() + "\",\"teacher\":" + teacherJson(result.getValue()) + "}");
        }));

        server.createContext("/api/auth/me", ex -> wrap(ex, () -> {
            Teacher teacher = requireTeacher(ex);
            sendJson(ex, 200, "{\"teacher\":" + teacherJson(teacher) + "}");
        }));

        server.createContext("/api/state", ex -> wrap(ex, () -> {
            requireTeacher(ex);
            sendJson(ex, 200, buildStateJson());
        }));

        server.createContext("/api/students", ex -> wrap(ex, () -> {
            requireTeacher(ex);
            String method = ex.getRequestMethod().toUpperCase();
            String path = ex.getRequestURI().getPath();
            if ("POST".equals(method)) {
                String body = readBody(ex);
                service.addStudent(extractNumber(body, "rollNo"), extractString(body, "name"));
                sendJson(ex, 201, buildStateJson());
            } else if ("DELETE".equals(method) && path.startsWith("/api/students/")) {
                int roll = Integer.parseInt(path.substring("/api/students/".length()));
                service.deleteStudent(roll);
                sendJson(ex, 200, buildStateJson());
            } else {
                sendJson(ex, 405, "{\"error\":\"Method not allowed\"}");
            }
        }));

        server.createContext("/api/attendance", ex -> wrap(ex, () -> {
            requireTeacher(ex);
            String method = ex.getRequestMethod().toUpperCase();
            String body = readBody(ex);
            if ("POST".equals(method) || "PUT".equals(method)) {
                service.markAttendance(
                        extractString(body, "date"),
                        extractString(body, "subject"),
                        parseEntries(body),
                        "PUT".equals(method)
                );
                sendJson(ex, "POST".equals(method) ? 201 : 200, buildStateJson());
            } else if ("PATCH".equals(method)) {
                int roll = Integer.parseInt(extractNumber(body, "rollNo"));
                service.correctAttendance(
                        roll,
                        extractString(body, "subject"),
                        extractString(body, "date"),
                        extractString(body, "status").toUpperCase()
                );
                sendJson(ex, 200, buildStateJson());
            }
        }));

        server.createContext("/api/sample-data", ex -> wrap(ex, () -> {
            requireTeacher(ex);
            service.loadSampleData();
            sendJson(ex, 200, buildStateJson());
        }));

        server.createContext("/api/clear-data", ex -> wrap(ex, () -> {
            requireTeacher(ex);
            service.clearAllData();
            sendJson(ex, 200, buildStateJson());
        }));

        server.createContext("/api/export/", ex -> wrap(ex, () -> {
            requireTeacher(ex);
            String path = ex.getRequestURI().getPath();
            String csv;
            String filename;
            if (path.endsWith("students.csv") || path.endsWith("students")) {
                csv = service.exportStudentsCsv();
                filename = "students.csv";
            } else if (path.endsWith("attendance.csv") || path.endsWith("attendance")) {
                csv = service.exportAttendanceCsv();
                filename = "attendance.csv";
            } else {
                sendJson(ex, 404, "{\"error\":\"Unknown export file\"}");
                return;
            }
            byte[] bytes = csv.getBytes(StandardCharsets.UTF_8);
            ex.getResponseHeaders().set("Content-Type", "text/csv; charset=utf-8");
            ex.getResponseHeaders().set("Content-Disposition", "attachment; filename=\"" + filename + "\"");
            ex.sendResponseHeaders(200, bytes.length);
            try (OutputStream os = ex.getResponseBody()) {
                os.write(bytes);
            }
        }));

        server.createContext("/api/import/students", ex -> wrap(ex, () -> {
            requireTeacher(ex);
            String body = readBody(ex);
            service.importStudentsCsv(extractString(body, "csv"));
            sendJson(ex, 200, buildStateJson());
        }));

        server.createContext("/api/import/attendance", ex -> wrap(ex, () -> {
            requireTeacher(ex);
            String body = readBody(ex);
            service.importAttendanceCsv(extractString(body, "csv"));
            sendJson(ex, 200, buildStateJson());
        }));

        server.createContext("/api/backup", ex -> wrap(ex, () -> {
            requireTeacher(ex);
            Pair<Long, Long> stats = service.triggerBackupAndReport();
            sendJson(ex, 200, "{\"snapshotBytes\":" + stats.getKey() + ",\"lastAutoBackupBytes\":" + stats.getValue() + "}");
        }));

        server.createContext("/api/restore", ex -> wrap(ex, () -> {
            requireTeacher(ex);
            service.restoreFromBackup();
            sendJson(ex, 200, buildStateJson());
        }));

        server.createContext("/api/eligibility/", ex -> wrap(ex, () -> {
            requireTeacher(ex);
            int roll = Integer.parseInt(ex.getRequestURI().getPath().substring("/api/eligibility/".length()));
            service.checkStudentEligibility(roll);
            sendJson(ex, 200, "{\"eligible\":true}");
        }));

        // Global Error Page HTML endpoint demonstration
        server.createContext("/error-page", ex -> {
            String html = GlobalExceptionHandler.renderGlobalErrorHtml(
                    new IllegalStateException("Sample Global Error Page view"),
                    ex.getRequestURI().getPath()
            );
            byte[] bytes = html.getBytes(StandardCharsets.UTF_8);
            ex.getResponseHeaders().set("Content-Type", "text/html; charset=utf-8");
            ex.sendResponseHeaders(500, bytes.length);
            try (OutputStream os = ex.getResponseBody()) {
                os.write(bytes);
            }
        });

        server.start();
        System.out.println("AttendanceHttpController listening on http://0.0.0.0:" + port);
    }

    @FunctionalInterface
    private interface ThrowingHandler {
        void handle() throws Exception;
    }

    private void wrap(HttpExchange ex, ThrowingHandler handler) throws IOException {
        if (handleCors(ex)) return;
        try {
            handler.handle();
        } catch (Exception exception) {
            int status = GlobalExceptionHandler.resolveStatusCode(exception);
            String accept = ex.getRequestHeaders().getFirst("Accept");
            if (accept != null && accept.contains("text/html")) {
                String html = GlobalExceptionHandler.renderGlobalErrorHtml(exception, ex.getRequestURI().getPath());
                byte[] bytes = html.getBytes(StandardCharsets.UTF_8);
                ex.getResponseHeaders().set("Content-Type", "text/html; charset=utf-8");
                ex.sendResponseHeaders(status, bytes.length);
                try (OutputStream os = ex.getResponseBody()) {
                    os.write(bytes);
                }
            } else {
                sendJson(ex, status, GlobalExceptionHandler.toJsonError(exception));
            }
        }
    }

    private Teacher requireTeacher(HttpExchange ex) {
        String auth = ex.getRequestHeaders().getFirst("Authorization");
        String token = (auth != null && auth.startsWith("Bearer ")) ? auth.substring(7).trim() : "";
        return service.verifyToken(token)
                .orElseThrow(() -> new SecurityException("Teacher authentication required."));
    }

    private String buildStateJson() throws Exception {
        List<Student> students = service.getStudents();
        List<AttendanceRecord> records = service.getRecords();
        StringBuilder sb = new StringBuilder("{\"students\":[");
        for (int i = 0; i < students.size(); i++) {
            Student s = students.get(i);
            if (i > 0) sb.append(",");
            sb.append("{\"rollNo\":").append(s.getRollNo())
              .append(",\"name\":\"").append(escape(s.getName())).append("\"}");
        }
        sb.append("],\"records\":[");
        for (int i = 0; i < records.size(); i++) {
            AttendanceRecord r = records.get(i);
            if (i > 0) sb.append(",");
            sb.append("{\"date\":\"").append(escape(r.getDate()))
              .append("\",\"subject\":\"").append(escape(r.getSubject()))
              .append("\",\"rollNo\":").append(r.getRollNo())
              .append(",\"status\":\"").append(escape(r.getStatus())).append("\"}");
        }
        sb.append("],\"subjects\":[");
        int idx = 0;
        for (String sub : service.getDirectory().getSortedSubjects()) {
            if (idx++ > 0) sb.append(",");
            sb.append("\"").append(escape(sub)).append("\"");
        }
        sb.append("],\"dates\":[");
        idx = 0;
        for (String d : service.getDirectory().getRecordsByDateDesc().keySet()) {
            if (idx++ > 0) sb.append(",");
            sb.append("\"").append(escape(d)).append("\"");
        }
        sb.append("]}");
        return sb.toString();
    }

    private static String teacherJson(Teacher t) {
        return "{\"id\":\"" + escape(t.getId()) + "\",\"name\":\"" + escape(t.getName()) +
                "\",\"email\":\"" + escape(t.getEmail()) + "\",\"department\":\"" + escape(t.getDepartment()) + "\"}";
    }

    private static boolean handleCors(HttpExchange ex) throws IOException {
        Headers h = ex.getResponseHeaders();
        h.set("Access-Control-Allow-Origin", "*");
        h.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
        h.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
        if ("OPTIONS".equalsIgnoreCase(ex.getRequestMethod())) {
            ex.sendResponseHeaders(204, -1);
            ex.close();
            return true;
        }
        return false;
    }

    private static String readBody(HttpExchange ex) throws IOException {
        try (InputStream is = ex.getRequestBody()) {
            return new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private static void sendJson(HttpExchange ex, int status, String json) throws IOException {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        ex.sendResponseHeaders(status, bytes.length);
        try (OutputStream os = ex.getResponseBody()) {
            os.write(bytes);
        }
    }

    private static String extractString(String json, String key) {
        Matcher m = Pattern.compile("\"" + Pattern.quote(key) + "\"\\s*:\\s*\"((?:\\\\.|[^\"])*)\"").matcher(json);
        if (!m.find()) return "";
        return m.group(1)
                .replace("\\r\\n", "\n")
                .replace("\\n", "\n")
                .replace("\\r", "\r")
                .replace("\\t", "\t")
                .replace("\\\"", "\"")
                .replace("\\\\", "\\");
    }

    private static String extractNumber(String json, String key) {
        Matcher m = Pattern.compile("\"" + Pattern.quote(key) + "\"\\s*:\\s*(-?\\d+)").matcher(json);
        return m.find() ? m.group(1) : "";
    }

    private static Map<Integer, String> parseEntries(String json) {
        Map<Integer, String> map = new HashMap<>();
        Matcher objMatcher = Pattern.compile("\\{([^}]*)\\}").matcher(json);
        while (objMatcher.find()) {
            String obj = objMatcher.group(1);
            String rollStr = extractNumber("{" + obj + "}", "rollNo");
            String status = extractString("{" + obj + "}", "status").toUpperCase();
            if (!rollStr.isEmpty() && ("P".equals(status) || "A".equals(status))) {
                map.put(Integer.parseInt(rollStr), status);
            }
        }
        return map;
    }

    private static String escape(String s) {
        return s == null ? "" : s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
