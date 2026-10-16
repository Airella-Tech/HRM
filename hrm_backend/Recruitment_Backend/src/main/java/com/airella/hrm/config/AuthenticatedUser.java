package com.airella.hrm.config;

import java.security.Principal;

/**
 * Principal built from a User_Backend JWT. getName() returns the email;
 * userId is the user's id in User_Backend and may be null for older tokens.
 */
public record AuthenticatedUser(String email, Long userId) implements Principal {

    @Override
    public String getName() {
        return email;
    }
}