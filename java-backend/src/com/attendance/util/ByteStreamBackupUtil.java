package com.attendance.util;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;

/**
 * Unit 3: Byte streams (FileInputStream / FileOutputStream) for binary backup and restore
 * of the SQLite database file or CSV exports.
 */
public final class ByteStreamBackupUtil {
    private static final int BUFFER_SIZE = 4096;

    private ByteStreamBackupUtil() {}

    public static long copyUsingByteStreams(File source, File destination) throws IOException {
        if (!source.exists()) {
            throw new IOException("Source file does not exist: " + source.getAbsolutePath());
        }
        File parent = destination.getParentFile();
        if (parent != null && !parent.exists()) {
            parent.mkdirs();
        }

        long totalBytes = 0;
        // Try-with-resources guarantees streams close cleanly; explicit FileInputStream & FileOutputStream
        try (FileInputStream fis = new FileInputStream(source);
             FileOutputStream fos = new FileOutputStream(destination)) {
            byte[] buffer = new byte[BUFFER_SIZE];
            int bytesRead;
            while ((bytesRead = fis.read(buffer)) != -1) {
                fos.write(buffer, 0, bytesRead);
                totalBytes += bytesRead;
            }
            fos.flush();
        }
        return totalBytes;
    }
}
