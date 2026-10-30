package com.airella.hrm.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * The PDF CV attached to a candidate application.
 * Kept apart from candidate_applications so that querying and listing applications
 * does not load every heavy file binary array into memory.
 * Stored as PostgreSQL bytea.
 */
@Entity
@Table(name = "candidate_application_documents",
        indexes = {
                @Index(name = "idx_cad_application_id", columnList = "application_id", unique = true)
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"data"})
@EqualsAndHashCode(of = "id")
public class CandidateApplicationDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "application_id", nullable = false, unique = true)
    private Long applicationId;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "content_type", nullable = false)
    private String contentType = "application/pdf";

    @Column(name = "file_size")
    private Long fileSize;

    @Column(nullable = false, columnDefinition = "bytea")
    private byte[] data;
}
