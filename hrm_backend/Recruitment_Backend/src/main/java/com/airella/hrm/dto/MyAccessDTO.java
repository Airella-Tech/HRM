package com.airella.hrm.dto;

import java.util.List;
import java.util.Set;

/** What the logged-in user may do in recruitment (the frontend uses this to show or hide things). */
public record MyAccessDTO(boolean fullAccess, boolean hasRecruitmentAccess,
                          Set<String> permissions, List<String> roles) {
}