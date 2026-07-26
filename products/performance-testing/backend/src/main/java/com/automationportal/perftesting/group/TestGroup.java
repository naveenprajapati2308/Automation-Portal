package com.automationportal.perftesting.group;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "perf_test_group")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TestGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "run_strategy", nullable = false)
    @Builder.Default
    private RunStrategy runStrategy = RunStrategy.SEQUENTIAL;

    @Column(name = "stop_on_failure", nullable = false)
    @Builder.Default
    private Boolean stopOnFailure = false;

    @Column(name = "schedule_cron", length = 100)
    private String scheduleCron;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @OneToMany(mappedBy = "groupId", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private List<TestGroupMember> members = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
