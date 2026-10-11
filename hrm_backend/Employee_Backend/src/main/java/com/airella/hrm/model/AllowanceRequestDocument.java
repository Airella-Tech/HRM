package com.airella.hrm.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * The PDF attached to an allowance request. Kept apart from allowance_requests so listing
 * requests does not load every file.
 */
@Entity
@Table(name = "allowance_request_documents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"data"})
@EqualsAndHashCode(of = "id")
public class AllowanceRequestDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "allowance_request_id", nullable = false, unique = true)
    private Long allowanceRequestId;

    @Column(nullable = false)
    private String fileName;

    @Column(nullable = false)
    private String contentType;

    @Column(nullable = false, columnDefinition = "bytea")
    private byte[] data;
}
