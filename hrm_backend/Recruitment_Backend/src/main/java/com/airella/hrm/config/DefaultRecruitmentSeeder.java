package com.airella.hrm.config;

import com.airella.hrm.model.RecruitmentPermission;
import com.airella.hrm.repository.RecruitmentPermissionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DefaultRecruitmentSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DefaultRecruitmentSeeder.class);

    private final RecruitmentPermissionRepository permissionRepo;

    public DefaultRecruitmentSeeder(RecruitmentPermissionRepository permissionRepo) {
        this.permissionRepo = permissionRepo;
    }

    @Override
    public void run(String... args) {
        List<RecruitmentPermission> defaultPermissions = List.of(
                new RecruitmentPermission("VACANCY_CREATE", "VACANCY", "Create and edit job vacancy drafts"),
                new RecruitmentPermission("VACANCY_APPROVE", "VACANCY", "Approve or reject job vacancies in workflow"),
                new RecruitmentPermission("VACANCY_PUBLISH", "VACANCY", "Publish approved vacancies to Careers page or close them"),
                new RecruitmentPermission("APPLICATION_VIEW", "APPLICATION", "View candidate applications and candidate list"),
                new RecruitmentPermission("APPLICATION_SCREEN", "APPLICATION", "Evaluate eligibility, enter screening scores and review notes"),
                new RecruitmentPermission("APPLICATION_SHORTLIST", "APPLICATION", "Advance candidates to shortlist or reject with reasons"),
                new RecruitmentPermission("INTERVIEW_SCHEDULE", "INTERVIEW", "Schedule interview rounds and set session logistics"),
                new RecruitmentPermission("INTERVIEW_ASSIGN", "INTERVIEW", "Assign and change evaluators for specific interviews"),
                new RecruitmentPermission("INTERVIEW_EVALUATE", "INTERVIEW", "Submit feedback and ratings for assigned interviews"),
                new RecruitmentPermission("INTERVIEW_PROGRESS_VIEW", "INTERVIEW", "View interview progress and candidate interview status"),
                new RecruitmentPermission("OFFER_MANAGE", "OFFER", "Create, issue, and manage formal job offers"),
                new RecruitmentPermission("RECRUITMENT_ROLE_ADMIN", "SETTINGS", "Create and manage custom recruitment roles and assign users"),
                new RecruitmentPermission("INTERVIEW_DECIDE", "INTERVIEW", "Approve or reject candidates after reviewing interview evaluations"),
                new RecruitmentPermission("INTERVIEW_DECIDE", "INTERVIEW", "Approve or reject candidates after reviewing interview evaluations"),
new RecruitmentPermission("AUDIT_VIEW", "SETTINGS", "View the recruitment audit log")

    );

        for (RecruitmentPermission p : defaultPermissions) {
            if (!permissionRepo.existsByPermissionCode(p.getPermissionCode())) {
                permissionRepo.save(p);
                log.info("[SEED] Inserted recruitment permission: {}", p.getPermissionCode());
            }
        }
    }
}
