package com.airella.hrm.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * Utility class for testing and generating BCrypt passwords
 */
public class PasswordUtil {
    
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        
        // Test password
        String rawPassword = "test123";
        
        // Generate new BCrypt hash
        String encodedPassword = encoder.encode(rawPassword);
        System.out.println("Raw Password: " + rawPassword);
        System.out.println("Encoded Password: " + encodedPassword);
        
        // Test against the one in the SQL file
        String sqlEncodedPassword = "$2a$10$XptfskKXKa0NKbLyskJ92OjD7jHFbrdRgSDqX6d5jb3CtN9vXHQ5W";
        boolean matches = encoder.matches(rawPassword, sqlEncodedPassword);
        System.out.println("\nDoes 'test123' match SQL encoded password? " + matches);
        
        // Test different passwords
        System.out.println("\n--- Testing different passwords ---");
        String[] testPasswords = {"test123", "admin123", "password", "123456"};
        for (String pass : testPasswords) {
            String encoded = encoder.encode(pass);
            System.out.println(pass + " -> " + encoded);
            System.out.println("Verification: " + encoder.matches(pass, encoded));
        }
    }
}
