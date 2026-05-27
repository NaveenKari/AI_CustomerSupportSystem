package com.customersupport.repository;

import com.customersupport.model.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long>, JpaSpecificationExecutor<Ticket> {

    /**
     * Loads a ticket with its messages in a single query (no lazy-load risk).
     * Use this whenever the message thread is needed (detail view, reply).
     */
    @Query("SELECT t FROM Ticket t LEFT JOIN FETCH t.messages WHERE t.id = :id")
    Optional<Ticket> findByIdWithMessages(@Param("id") Long id);

    // ── Aggregate queries used by MetricsService ──────────────────────────────

    /** Returns [TicketStatus, count] rows — used to build the byStatus breakdown. */
    @Query("SELECT t.status, COUNT(t) FROM Ticket t GROUP BY t.status")
    List<Object[]> countByStatus();

    /** Returns [TicketCategory, count] rows — used to build the byCategory breakdown. */
    @Query("SELECT t.category, COUNT(t) FROM Ticket t GROUP BY t.category")
    List<Object[]> countByCategory();

    /** Counts tickets created at or after the given datetime (used for today/this-week totals). */
    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.createdAt >= :from")
    long countCreatedAfter(@Param("from") LocalDateTime from);

    /**
     * Counts open (non-RESOLVED) tickets created before the cutoff.
     * Used to calculate the "backlog older than 24h" alert metric.
     */
    @Query("SELECT COUNT(t) FROM Ticket t " +
           "WHERE t.status <> com.customersupport.model.TicketStatus.RESOLVED " +
           "AND t.createdAt <= :cutoff")
    long countOpenOlderThan(@Param("cutoff") LocalDateTime cutoff);
}
