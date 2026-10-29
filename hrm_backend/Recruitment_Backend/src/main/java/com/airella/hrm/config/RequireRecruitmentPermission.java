package com.airella.hrm.config;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Declarative method-level annotation to enforce recruitment permissions.
 *
 * Examples:
 *   @RequireRecruitmentPermission("VACANCY_CREATE")
 *   @RequireRecruitmentPermission(anyOf = {"VACANCY_CREATE", "VACANCY_APPROVE"})
 *   @RequireRecruitmentPermission(allOf = {"INTERVIEW_SCHEDULE", "INTERVIEW_ASSIGN"})
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface RequireRecruitmentPermission {

    /** Single permission code to check (convenience shorthand). */
    String value() default "";

    /** User must have AT LEAST ONE of these permissions. */
    String[] anyOf() default {};

    /** User must have ALL of these permissions. */
    String[] allOf() default {};
}
