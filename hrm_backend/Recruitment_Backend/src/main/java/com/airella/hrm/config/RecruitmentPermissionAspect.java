package com.airella.hrm.config;

import com.airella.hrm.service.PermissionService;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;

/**
 * AOP Aspect enforcing @RequireRecruitmentPermission annotations on controller and service methods.
 */
@Aspect
@Component
@Order(1)
public class RecruitmentPermissionAspect {

    private final PermissionService permissionService;

    public RecruitmentPermissionAspect(PermissionService permissionService) {
        this.permissionService = permissionService;
    }

    @Before("@annotation(com.airella.hrm.config.RequireRecruitmentPermission) || @within(com.airella.hrm.config.RequireRecruitmentPermission)")
    public void checkPermission(JoinPoint joinPoint) {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();

        RequireRecruitmentPermission annotation = method.getAnnotation(RequireRecruitmentPermission.class);
        if (annotation == null) {
            annotation = joinPoint.getTarget().getClass().getAnnotation(RequireRecruitmentPermission.class);
        }

        if (annotation == null) {
            return;
        }

        if (annotation.value() != null && !annotation.value().isBlank()) {
            permissionService.require(annotation.value().trim());
        }

        if (annotation.anyOf() != null && annotation.anyOf().length > 0) {
            permissionService.requireAny(annotation.anyOf());
        }

        if (annotation.allOf() != null && annotation.allOf().length > 0) {
            permissionService.requireAll(annotation.allOf());
        }
    }
}
