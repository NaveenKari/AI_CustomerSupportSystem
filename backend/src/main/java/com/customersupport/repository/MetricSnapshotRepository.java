package com.customersupport.repository;

import com.customersupport.model.MetricSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface MetricSnapshotRepository extends JpaRepository<MetricSnapshot, Long> {

    /** Returns the most recently computed snapshot (used by the /stats endpoint). */
    Optional<MetricSnapshot> findTopByOrderByComputedAtDesc();

    /**
     * Deletes rows older than the given cutoff.
     * Called by the scheduler after each insert to enforce the 7-day retention policy.
     */
    @Modifying
    @Query("DELETE FROM MetricSnapshot s WHERE s.computedAt < :cutoff")
    void deleteOlderThan(@Param("cutoff") LocalDateTime cutoff);
}
