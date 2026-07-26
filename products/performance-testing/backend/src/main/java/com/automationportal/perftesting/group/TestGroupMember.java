package com.automationportal.perftesting.group;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "perf_test_group_member")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TestGroupMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "group_id", nullable = false)
    private Long groupId;

    @Enumerated(EnumType.STRING)
    @Column(name = "test_type", nullable = false)
    private MemberTestType testType;

    @Column(name = "test_id", nullable = false)
    private Long testId;

    @Column(name = "sequence_order", nullable = false)
    @Builder.Default
    private Integer sequenceOrder = 0;
}
