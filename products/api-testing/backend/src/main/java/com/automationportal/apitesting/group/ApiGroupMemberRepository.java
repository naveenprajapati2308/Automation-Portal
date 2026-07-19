package com.automationportal.apitesting.group;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ApiGroupMemberRepository extends JpaRepository<ApiGroupMember, Long> {

    List<ApiGroupMember> findByGroupIdOrderBySeqAsc(Long groupId);

    List<ApiGroupMember> findByRegularApiId(Long regularApiId);

    boolean existsByGroupIdAndRegularApiId(Long groupId, Long regularApiId);

    long countByGroupId(Long groupId);

    void deleteByGroupIdAndRegularApiId(Long groupId, Long regularApiId);
}
