package com.attendance.exception;

/**
 * Unit 2: Global Exception Handler rendering both structured JSON error payloads
 * and an HTML Global Error Page for unhandled or custom domain exceptions.
 */
public final class GlobalExceptionHandler {
    private GlobalExceptionHandler() {}

    public static int resolveStatusCode(Throwable ex) {
        if (ex instanceof InvalidStudentException ise) {
            return ise.getStatusCode();
        }
        if (ex instanceof DuplicateAttendanceException) {
            return 409;
        }
        if (ex instanceof LowAttendanceException) {
            return 422;
        }
        if (ex instanceof SecurityException) {
            return 401;
        }
        if (ex instanceof IllegalArgumentException) {
            return 400;
        }
        return 500;
    }

    public static String toJsonError(Throwable ex) {
        String type = ex.getClass().getSimpleName();
        String msg = ex.getMessage() == null ? "Unexpected server error" : ex.getMessage();
        return "{\"errorType\":\"" + escape(type) + "\",\"error\":\"" + escape(msg) + "\"}";
    }

    public static String renderGlobalErrorHtml(Throwable ex, String requestPath) {
        int code = resolveStatusCode(ex);
        String type = ex.getClass().getSimpleName();
        String msg = ex.getMessage() == null ? "An unexpected error occurred." : ex.getMessage();
        return "<!doctype html><html lang='en'><head><meta charset='UTF-8'/>"
                + "<title>Error " + code + " - Attendance Ledger</title>"
                + "<style>body{font-family:system-ui,sans-serif;background:#F8FAFC;color:#0F172A;margin:0;padding:48px 20px;}"
                + ".card{max-width:580px;margin:0 auto;background:#fff;border:1px solid #E2E8F0;border-radius:8px;padding:32px;}"
                + "h1{margin:0 0 8px;font-size:20px;} .meta{font-family:monospace;font-size:12px;color:#DC2626;margin-bottom:16px;}"
                + "p{color:#475569;line-height:1.5;} a{display:inline-block;margin-top:16px;color:#1D4ED8;font-weight:600;text-decoration:none;}</style>"
                + "</head><body><div class='card'>"
                + "<div class='meta'>HTTP " + code + " &middot; " + escapeHtml(type) + " &middot; " + escapeHtml(requestPath) + "</div>"
                + "<h1>Global Error Page</h1>"
                + "<p>" + escapeHtml(msg) + "</p>"
                + "<a href='/'>Return to Attendance Ledger</a>"
                + "</div></body></html>";
    }

    private static String escape(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", " ");
    }

    private static String escapeHtml(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
