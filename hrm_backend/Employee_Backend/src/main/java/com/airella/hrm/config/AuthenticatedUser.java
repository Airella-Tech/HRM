package com.airella.hrm.config;

import java.security.Principal;

/**
 * Principal built from a User_Backend JWT. getName() returns the email so
 * existing authentication.getName() lookups keep working; userId is the
 * user's id in User_Backend and may be null for tokens issued before it was added.
 */
public record AuthenticatedUser(String email, Long userId) implements Principal {

    @Override
    public String getName() {
        return email;
    }
}
